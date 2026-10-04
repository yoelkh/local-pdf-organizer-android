# Android File I/O Implementation Notes

## Architecture
We use a hybrid approach to handle Android `content://` URIs and app-private storage:

1. **Importing:** When a file is selected via a system picker, it returns a `content://` URI. We resolve this URI using a custom Kotlin plugin (`FileIoPlugin.kt`) to get its display name, then stream-copy its bytes into the app's cache directory (`<cache>/imports/<uuid>/<name>`). From this point onward, the Rust backend works with a real file path and standard Rust `std::fs` operations, keeping the core feature logic platform-agnostic.
2. **Exporting:** All generated results (like merged PDFs) are first written to `<cache>/exports/<uuid>/<name>`. The frontend then initiates a "save" or "share" operation via the custom Kotlin plugin, which uses the Android `MediaStore` or `Intent.ACTION_SEND` (with `FileProvider`) to move/share the cached result to the final destination.

## Custom Kotlin Plugin (`id.local.pdforganizer.FileIoPlugin`)
- **`getDisplayName(uri)`**: Queries Android's `ContentResolver` to extract the human-readable name of a file.
- **`saveToDownloads(paths, subDir)`**: Uses `MediaStore.Downloads` on API >= 29 to save files to the public `Download/Local PDF Organizer` directory. Handles multiple files seamlessly.
- **`share(paths, mimeType)`**: Shares files using an `ACTION_SEND` or `ACTION_SEND_MULTIPLE` intent. Grants temporary read access to other apps via `FileProvider`.
- **`openFile(path, mimeType)`**: Uses `ACTION_VIEW` intent with `FileProvider` to let the user open generated files in other apps.

## Safety & Cleanup
- The Rust cache directory is extended with `imports/` and `exports/`. Both are entirely cleared during app startup (`CacheDir::prepare`), ensuring temporary files don't leak storage over time.
- All delivery commands on Android enforce that passed file paths are securely contained inside the `exports/` folder to prevent path traversal attacks.

## Desktop Parity
- The Rust `commands.rs` interface is identical on both desktop and Android, shielding the frontend from branching logic.
- Unimplemented commands on desktop (like `save_outputs_to_downloads`) safely return an `AppError::Unsupported`.
