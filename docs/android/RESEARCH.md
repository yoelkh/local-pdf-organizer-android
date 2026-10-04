# Android Port Research

> **Corrections (lead, 2026-10-04).** This is the research snapshot taken before implementation.
> The Kotlin package is `id.local.pdforganizer`, not `com.localpdforganizer`. The implemented design
> is in `IO_CONTRACT.md` and `FILE_IO.md`; where they differ from this file, they are authoritative.

## Answers

**Q1. `open()` from plugin-dialog on Android**
- **Conclusion:** `open()` returns an `OpenResponse` containing a `FilePath` mapped to a `content://` URI string (or a list of them for multiple). Filters are correctly mapped to Android MIME types using `MimeTypeMap.getSingleton().getMimeTypeFromExtension()`. Selecting directories (`directory: true`) is strictly unsupported on Android.
- **Evidence:**
  - `tauri-plugin-dialog-2.7.3/android/src/main/java/DialogPlugin.kt`: `intent.type = "*/*"; intent.putExtra(Intent.EXTRA_MIME_TYPES, parsedTypes)`
  - `tauri-plugin-dialog-2.7.3/src/commands.rs`: `#[cfg(mobile)] return Err(crate::Error::FolderPickerNotImplemented);`

**Q2. Reading `content://` URI string in Rust**
- **Conclusion:** The exact minimal way is to use `tauri_plugin_fs` to get a native `std::fs::File`, bypassing IPC limits: `app.fs().open(FilePath::from_str(uri)?, OpenOptions::new().read(true))?`. You can stream-copy this to the app cache and get its size via `.metadata()?.len()`. However, Tauri has no built-in way to extract the display name of a `content://` URI, requiring a small custom Kotlin plugin.
- **Evidence:** 
  - `tauri-plugin-fs-2.5.2/src/android.rs`: `self.resolve_content_uri(u.to_string(), opts.android_mode())` opens an Android `ParcelFileDescriptor` and wraps it in `std::fs::File`.
  - `tauri-plugin-fs-2.5.2/src/lib.rs`: `impl FsExt for T { fn fs(&self) -> &Fs<R> { ... } }`

**Q3. `save()` from plugin-dialog on Android**
- **Conclusion:** Returns an `Option<FilePath>` mapped to a new `content://` document URI created by the system picker. You write bytes using the same `tauri_plugin_fs` API: `app.fs().open(uri, OpenOptions::new().write(true).truncate(true))`. `defaultPath` sets the suggested file name.
- **Evidence:**
  - `tauri-plugin-dialog-2.7.3/android/src/main/java/DialogPlugin.kt`: `val intent = Intent(Intent.ACTION_CREATE_DOCUMENT); intent.putExtra(Intent.EXTRA_TITLE, args.fileName ?: "")`

**Q4. Sharing / Opening cache files in other apps**
- **Conclusion:** `tauri-plugin-opener` 2.5.5 does **not** support this on Android. It blindly converts the path to a `file://` URI (`args.url.toUri()`), which crashes Android 7.0+ via `FileUriExposedException` because it lacks a `FileProvider` and `FLAG_GRANT_READ_URI_PERMISSION`. There is no official Tauri share plugin. A minimal custom Kotlin plugin utilizing `FileProvider` is required for both sharing and opening.
- **Evidence:**
  - `tauri-plugin-opener-2.5.5/android/src/main/java/OpenerPlugin.kt`: `val intent = Intent(Intent.ACTION_VIEW, args.url.toUri())`

**Q5. Thumbnails and `convertFileSrc`**
- **Conclusion:** On Android, `convertFileSrc` typically produces `http://asset.localhost/<path>`. The asset protocol can serve from the cache directory (which resolves to `/data/user/0/<app.package.name>/cache`) if configured in `tauri.conf.json`. The CSP `img-src` must contain `http://asset.localhost`.
- **Evidence:**
  - Tauri 2 Core JS `scripts/core.js`: `` return osName === 'windows' || osName === 'android' ? `${protocolScheme}://${protocol}.localhost/${path}` : ... ``

**Q6. PDFium loading via `pdfium-render`**
- **Conclusion:** A bare library name `"libpdfium.so"` works perfectly via `dlopen`. The app's `jniLibs/arm64-v8a` is automatically included in the classloader's native search path. `android:extractNativeLibs` does not matter, as Android 6.0+ mmap's uncompressed libraries directly from the APK. `libpdfium.so` from `bblanchon/pdfium-binaries` links statically to libc++, so it does not depend on `libc++_shared.so`.
- **Evidence:**
  - `pdfium-render-0.9.3/src/pdfium.rs`: `Pdfium::bind_to_system_library()` explicitly loads `libloading::library_filename("pdfium")` ("libpdfium.so").

**Q7. Common Tauri 2 Android issues**
- **Conclusion:** 
  1. `<input type="file">` does not work in Android WebView out of the box (Tauri does not implement `onShowFileChooser`); must use JS dialog triggers.
  2. The app Activity might be killed by the OS when a picker is open due to memory pressure, losing JS state when it returns.
  3. Passing large files (> 2MB) over Tauri IPC causes OOM JSON serialization crashes; always pass paths/URIs to Rust.
  4. Unhandled drag-and-drop interactions on the WebView can trigger Android's native drag system and cause misbehavior (fix with CSS `user-select: none; -webkit-user-drag: none;`).

---

## Recommended implementation

### Rust & TS Signatures
```typescript
// src/shared/platform/fileIo.ts
export async function pickFile(): Promise<{ uri: string, name: string, cachePath: string } | null>;
export async function saveFile(cachePath: string, suggestedName: string): Promise<boolean>;
export async function shareFile(cachePath: string, mimeType: string): Promise<void>;
export async function openFileInApp(cachePath: string, mimeType: string): Promise<void>;
```

```rust
// src-tauri/src/core/platform/file_io.rs
#[tauri::command]
pub async fn import_file(app: tauri::AppHandle, uri: String) -> Result<String, AppError> {
    // Uses FileIoPlugin's getFileName, then app.fs().open() + std::io::copy to app_cache_dir()
}

#[tauri::command]
pub async fn export_file(app: tauri::AppHandle, cache_path: String, dest_uri: String) -> Result<(), AppError> {
    // Uses std::fs::File::open(cache_path) + app.fs().open(dest_uri, write=true) + std::io::copy
}
```

### Dependencies & Capabilities
- **Cargo dependencies**: Add `tauri-plugin-dialog` and `tauri-plugin-fs`.
- **Capabilities**: Ensure `fs:allow-app-cache-read` and `fs:allow-app-cache-write` are in the capabilities. `dialog:allow-open` and `dialog:allow-save`.

### Custom Kotlin Skeleton (`FileIoPlugin`)

Add the following to `src-tauri/gen/android/app/src/main/java/com/localpdforganizer/FileIoPlugin.kt`:

```kotlin
package com.localpdforganizer

import android.app.Activity
import android.content.Intent
import android.net.Uri
import android.provider.OpenableColumns
import androidx.core.content.FileProvider
import app.tauri.annotation.Command
import app.tauri.annotation.InvokeArg
import app.tauri.annotation.TauriPlugin
import app.tauri.plugin.Invoke
import app.tauri.plugin.JSObject
import app.tauri.plugin.Plugin
import java.io.File

@InvokeArg class ShareArgs { lateinit var path: String; lateinit var mimeType: String }
@InvokeArg class GetFileNameArgs { lateinit var uri: String }

@TauriPlugin
class FileIoPlugin(private val activity: Activity): Plugin(activity) {
    @Command
    fun share(invoke: Invoke) {
        try {
            val args = invoke.parseArgs(ShareArgs::class.java)
            val uri = FileProvider.getUriForFile(activity, "${activity.packageName}.fileprovider", File(args.path))
            val intent = Intent(Intent.ACTION_SEND).apply {
                type = args.mimeType
                putExtra(Intent.EXTRA_STREAM, uri)
                addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION)
            }
            activity.startActivity(Intent.createChooser(intent, "Share"))
            invoke.resolve()
        } catch (e: Exception) { invoke.reject(e.message) }
    }

    @Command
    fun openFile(invoke: Invoke) {
        try {
            val args = invoke.parseArgs(ShareArgs::class.java)
            val uri = FileProvider.getUriForFile(activity, "${activity.packageName}.fileprovider", File(args.path))
            val intent = Intent(Intent.ACTION_VIEW).apply {
                setDataAndType(uri, args.mimeType)
                addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION or Intent.FLAG_ACTIVITY_NEW_TASK)
            }
            activity.startActivity(intent)
            invoke.resolve()
        } catch (e: Exception) { invoke.reject(e.message) }
    }

    @Command
    fun getFileName(invoke: Invoke) {
        try {
            val uri = Uri.parse(invoke.parseArgs(GetFileNameArgs::class.java).uri)
            var name = ""
            activity.contentResolver.query(uri, null, null, null, null)?.use { cursor ->
                if (cursor.moveToFirst()) {
                    val idx = cursor.getColumnIndex(OpenableColumns.DISPLAY_NAME)
                    if (idx != -1) name = cursor.getString(idx) ?: ""
                }
            }
            if (name.isEmpty()) name = uri.lastPathSegment ?: "unknown"
            
            val res = JSObject()
            res.put("name", name)
            invoke.resolve(res)
        } catch (e: Exception) { invoke.reject(e.message) }
    }
}
```

**Wiring in Rust:**
```rust
// src-tauri/src/mobile_plugin.rs
pub fn init<R: tauri::Runtime>() -> tauri::plugin::TauriPlugin<R> {
    tauri::plugin::Builder::new("fileio")
        .setup(|_app, api| {
            #[cfg(target_os = "android")]
            api.register_android_plugin("com.localpdforganizer", "FileIoPlugin")?;
            Ok(())
        })
        .build()
}
// Call app.try_plugin_handle("fileio")?.run_mobile_plugin(...) in commands
```

### AndroidManifest.xml & FileProvider

Add to `src-tauri/gen/android/app/src/main/AndroidManifest.xml` inside `<application>`:
```xml
<provider
    android:name="androidx.core.content.FileProvider"
    android:authorities="${applicationId}.fileprovider"
    android:exported="false"
    android:grantUriPermissions="true">
    <meta-data
        android:name="android.support.FILE_PROVIDER_PATHS"
        android:resource="@xml/file_paths" />
</provider>
```

Add `src-tauri/gen/android/app/src/main/res/xml/file_paths.xml`:
```xml
<?xml version="1.0" encoding="utf-8"?>
<paths>
    <cache-path name="cache" path="." />
</paths>
```

---

## Unverified / to test on device
- OS killing Activity during File Picker: verify whether Tauri 2 automatically restores JS state on returning from the picker.
- Exact URI path conversion: `asset.localhost` vs `tauri.localhost` in `convertFileSrc` behavior on real Android WebView instances.
- Verifying the NDK version on the builder does not cause an unexpected missing dynamic link error if standard C libraries differ drastically (though static libc++ helps immensely).
