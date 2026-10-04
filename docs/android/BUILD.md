# Building the Android app

Status (2026-10-04): the release APK builds on the development PC and was exercised on a real phone
(Xiaomi, HyperOS 3, Android 16, arm64). See "Device test results" at the end.

## Prerequisites

- Android SDK with platform 36, build-tools, and an NDK (tested with NDK 30.0.16248370).
  Android Studio installs all of these.
- A JDK to launch Gradle. Android Studio's bundled `jbr` is enough, even when it is Java 25
  (see "JDK 25" below).
- Rust with the Android target: `rustup target add aarch64-linux-android`
- Node.js ≥ 20 and `npm install` done in the repo root.

No global environment variables are needed. Each shell session sets them with the project script:

```powershell
. .\scripts\android-env.ps1
```

It sets `ANDROID_HOME`, `NDK_HOME`, `JAVA_HOME` and `PATH` for that session only.

## Build

```powershell
. .\scripts\android-env.ps1
.\scripts\android-build.ps1 -Release
```

Output: `src-tauri/gen/android/app/build/outputs/apk/arm64/release/app-arm64-release.apk`
(about 20 MB, `arm64-v8a` only).

Without `-Release` the script builds the debug variant
(`…/apk/arm64/debug/app-arm64-debug.apk`). It keeps Rust debug symbols and is about 500 MB, so use it
only when you need a debugger.

### What the script does, and why

`tauri android build` normally compiles the Rust library and symlinks it into the Gradle project.
Creating symlinks on Windows requires Developer Mode. With Developer Mode off, the CLI stops with
"Creation symbolic link is not allowed for this system". The script therefore:

1. runs `npm run tauri -- android build --apk --target aarch64` (add `--debug` for debug; there is no
   `--release` flag, release is the default) and accepts only the symlink failure;
2. copies `src-tauri/target/aarch64-linux-android/<profile>/libapp_lib.so` to
   `gen/android/app/src/main/jniLibs/arm64-v8a/`;
3. runs `gradlew assembleArm64Release -x rustBuildArm64Release` (or the debug equivalents).

With Developer Mode on, step 1 alone produces the APK and the script is not needed.

## Install on a phone

The release build type is signed with the local **debug keystore**
(`signingConfig = signingConfigs.getByName("debug")` in `gen/android/app/build.gradle.kts`), so the
APK installs directly:

```powershell
adb install -r src-tauri\gen\android\app\build\outputs\apk\arm64\release\app-arm64-release.apk
```

Or copy the APK to the phone and open it (allow "install unknown apps" for the file manager).
Updates must be signed with the same keystore, so build them on the same PC. A public release
(Play Store or shared APK) needs its own release keystore.

## How PDFium gets into the APK

- Tracked file: `src-tauri/pdfium/android/jniLibs/arm64-v8a/libpdfium.so`
  (from `bblanchon/pdfium-binaries`, tag `chromium/8035`, same as the Windows `pdfium.dll`).
- `gen/android/app/build.gradle.kts` adds that folder as a `jniLibs` source dir, so Gradle packages
  it as `lib/arm64-v8a/libpdfium.so`. It lives outside `gen/` so re-running `tauri android init`
  cannot delete it (re-add the `jniLibs.srcDir` line if the Gradle file is regenerated).
- At startup `core/pdf/engine/bindings.rs` binds with the bare name `libpdfium.so`; the Android
  linker resolves it from the app's native library directory.
- The library needs no `libc++_shared.so` (checked with `llvm-readelf -d`).

## Troubleshooting

| Symptom | Cause and fix |
|---|---|
| `Unsupported class file major version 69` | Gradle 8.14.3 cannot run on Java 25. The repo ships `gen/android/gradle/gradle-daemon-jvm.properties` (`toolchainVersion=21`), so the Gradle wrapper downloads a JDK 21 into `~/.gradle/jdks` for its daemon. Keep that file. Do not move to Gradle 9 / AGP 9: the Tauri plugin modules do not build with them. |
| `Creation symbolic link is not allowed` | Developer Mode is off. Use `scripts/android-build.ps1`, or enable Developer Mode. |
| `error: unexpected argument '--release'` | `tauri android build` has no such flag; release is the default. |
| `adb devices` lists nothing | Reconnect the cable, set USB mode to file transfer, and accept the "Allow USB debugging" prompt on the phone. |
| Gradle asks for platform `android-36` | Let Gradle install it (licenses must be accepted in Android Studio's SDK Manager). |

## Device test results (2026-10-04, Xiaomi HyperOS 3 / Android 16)

Driven over adb (taps, long-press drag, swipes) with the sample files from `samples/`; every saved
file was pulled back and inspected.

| Area | Result |
|---|---|
| Startup | App launches; logcat shows `PDFium loaded from libpdfium.so`. |
| Import | System picker returns `content://` URIs; files are copied in, display names are correct, thumbnails render. Images go through the photo picker ("Browse…" reaches the file browser). |
| Merge | 6 files → 22 pages; saved PDF is valid with 22 pages. |
| Organize | Handoff from Merge loads the result; long-press drag reorders; plain swipe scrolls; rotate from the viewer; exported PDF has 22 pages and one `/Rotate 90`. |
| Images → PDF | 2 pages; rotated JPEG page is 900×1200 pt and stays `DCTDecode`. |
| PDF → Images | 2 PNG files saved in one action. |
| Compress | 2.04 MB → 210 KB (3 pages kept). |
| Save to Downloads | Files appear in `Download/Local PDF Organizer`. |
| Save to… | File written through the system "create document" dialog. |
| Share / Open | System chooser opens with a `content://id.local.pdforganizer.fileprovider/...` URI; no permission errors in logcat. Reading by the target app was not confirmed (the PDF viewer showed its own first-run consent screen). |
| Viewer | Swipe changes page, double-tap zooms to 2×, Back closes the viewer and keeps the page. |

Fixed during the device test: the viewer's top bar sat under the status bar (fixed height ignored the
safe-area padding).

Known and open:

- **Intermittent late import.** Twice (out of roughly a dozen picks) the files chosen in the picker
  did not appear until the next pick, when both batches arrived together. It did not reproduce in five
  targeted attempts afterwards (dwell times up to 75 s, Back inside the picker, cold start), so the
  cause is unknown. `inspect_files` now logs to logcat (`inspect_files: N sumber` / `N diterima`),
  which tells whether the request reached Rust if it happens again.
- **Pinch zoom** cannot be driven over adb and is still untested on a device.
- Xiaomi blocks `adb install` until "Install via USB" is enabled in Developer options.
- Whether the frontend assets the build script copies into `app/src/main/assets/` are needed at all
  (Tauri embeds the frontend in the Rust library); the copy is harmless but may be removable.
