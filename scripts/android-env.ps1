# Set variabel lingkungan Android untuk sesi shell ini saja (tidak mengubah sistem).
# Pakai:  . .\scripts\android-env.ps1
$sdk = Join-Path $env:LOCALAPPDATA "Android\Sdk"
if (-not (Test-Path $sdk)) { throw "Android SDK tidak ditemukan di $sdk" }

$ndkRoot = Join-Path $sdk "ndk"
$ndk = Get-ChildItem $ndkRoot -Directory -ErrorAction SilentlyContinue | Sort-Object Name -Descending | Select-Object -First 1
if (-not $ndk) { throw "Android NDK tidak ditemukan di $ndkRoot" }

$jbr = "C:\Program Files\Android\Android Studio\jbr"
if (-not (Test-Path (Join-Path $jbr "bin\java.exe"))) { throw "JDK (Android Studio jbr) tidak ditemukan di $jbr" }

$env:ANDROID_HOME = $sdk
$env:ANDROID_SDK_ROOT = $sdk
$env:NDK_HOME = $ndk.FullName
$env:ANDROID_NDK_HOME = $ndk.FullName
$env:JAVA_HOME = $jbr
$env:PATH = "$env:USERPROFILE\.cargo\bin;$jbr\bin;$sdk\platform-tools;$env:PATH"

Write-Host "ANDROID_HOME=$env:ANDROID_HOME"
Write-Host "NDK_HOME=$env:NDK_HOME"
Write-Host "JAVA_HOME=$env:JAVA_HOME"
