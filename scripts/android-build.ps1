param(
    [switch]$Release
)

$ErrorActionPreference = "Stop"

# `tauri android build` membangun rilis secara default; hanya debug yang butuh flag.
$profileFlag = if ($Release) { "" } else { "--debug" }
$target = "aarch64"
$apkFlavor = if ($Release) { "Arm64Release" } else { "Arm64Debug" }

Write-Host "Running Tauri CLI to compile Rust and frontend..."

# Run Tauri. We capture the stream to check for the symlink error.
$tauriOutput = ""
try {
    # Using cmd /c to ensure npm runs and we capture stdout+stderr
    $tauriOutput = cmd /c "npm run tauri -- android build $profileFlag --apk --target $target 2>&1"
    $exitCode = $LASTEXITCODE
    Write-Host $tauriOutput
    if ($exitCode -ne 0) {
        throw "Tauri CLI exited with code $exitCode"
    }
} catch {
    Write-Host $tauriOutput
    if ($tauriOutput -match "symbolic link" -or $tauriOutput -match "SeCreateSymbolicLinkPrivilege") {
        Write-Host "Caught expected Windows symlink error. Workaround will be applied."
    } else {
        Write-Error "Tauri build failed with an unexpected error."
        exit 1
    }
}

$targetDirProfile = if ($Release) { "release" } else { "debug" }
$soPath = "src-tauri\target\aarch64-linux-android\$targetDirProfile\libapp_lib.so"

if (-not (Test-Path $soPath)) {
    Write-Error "Failed to build Rust library. $soPath not found."
    exit 1
}

# Apply Workaround: Copy library
$jniDir = "src-tauri\gen\android\app\src\main\jniLibs\arm64-v8a"
if (-not (Test-Path $jniDir)) {
    New-Item -ItemType Directory -Path $jniDir -Force | Out-Null
}
Copy-Item -Path $soPath -Destination "$jniDir\libapp_lib.so" -Force
Write-Host "Copied libapp_lib.so to $jniDir"

$assetsDir = "src-tauri\gen\android\app\src\main\assets"
if (-not (Test-Path $assetsDir)) {
    New-Item -ItemType Directory -Path $assetsDir -Force | Out-Null
}
Copy-Item -Path "dist\*" -Destination $assetsDir -Recurse -Force
Write-Host "Copied frontend assets to $assetsDir"

# Run Gradle to finish the APK, skipping the Rust task
Write-Host "Running Gradle assemble$apkFlavor..."
Push-Location "src-tauri\gen\android"
try {
    $gradleExit = 0
    cmd /c ".\gradlew.bat assemble$apkFlavor -x rustBuild$apkFlavor"
    $gradleExit = $LASTEXITCODE
    if ($gradleExit -ne 0) {
        throw "Gradle build failed."
    }
} catch {
    Pop-Location
    Write-Error "Gradle build failed."
    exit 1
}
Pop-Location

$apkProfileDir = if ($Release) { "release" } else { "debug" }
$apkName = if ($Release) { "app-arm64-release.apk" } else { "app-arm64-debug.apk" }
$apkOut = "src-tauri\gen\android\app\build\outputs\apk\arm64\$apkProfileDir\$apkName"

if (Test-Path $apkOut) {
    Write-Host "Success! APK generated at: $(Resolve-Path $apkOut)"
} else {
    # Sometimes it's just app-debug.apk if flavor is not correctly mapped in path
    $fallbackOut = "src-tauri\gen\android\app\build\outputs\apk\arm64\$apkProfileDir\app-debug.apk"
    if (Test-Path $fallbackOut) {
         Write-Host "Success! APK generated at: $(Resolve-Path $fallbackOut)"
    } else {
         Write-Error "APK not found at $apkOut."
         exit 1
    }
}
