# File I/O contract (desktop + Android)

Set by the lead. The backend and frontend engineers implement the two sides of this contract in
parallel, so neither side may change a name, argument, or return shape without the lead.
Facts behind it: `docs/android/RESEARCH.md` (verified: the Android picker returns bare `content://`
URIs without names; `tauri_plugin_fs` `app.fs().open(FilePath, OpenOptions)` turns such a URI into a
`std::fs::File`; folder picking is not implemented on mobile; `tauri-plugin-opener` cannot open
app-private files on Android).

## Principles

- No file bytes ever cross the IPC bridge. Only paths and URIs do.
- Feature services stay platform-agnostic: they always receive real filesystem paths.
- On Android every result is first written inside the app cache, then delivered by an explicit
  user action (save / share / open).
- Android delivery commands only accept paths inside `<app cache>/exports/` (canonicalized check).

## Cache layout (all platforms)

```
<app_cache_dir>/thumbs/<fileId>/…      existing thumbnail cache
<app_cache_dir>/imports/<uuid>/<name>  Android: local copy of a picked content URI
<app_cache_dir>/exports/<uuid>/<name>  results waiting to be saved/shared (Android)
```
All three are wiped at app start (extend `CacheDir::prepare`).

## Commands

Tauri converts Rust `snake_case` argument names to `camelCase` on the JS side. Field names inside
structs follow serde (snake_case here). Errors are `AppError` → `{ code, message }`.

| Command | Args (JS) | Returns | Platforms | Behavior |
|---|---|---|---|---|
| `inspect_files` | `paths: string[]` | `InspectResult` (unchanged) | all | Each entry is a real path **or** a `content://` URI. URIs are imported (stream-copied) to `imports/`, and the entry's `name` is the provider's display name; `path` in `FileInfo` is the local copy. Kind detection must not rely on the URI: use the display name's extension, and when that is missing or unknown, sniff the content (`%PDF-` header, `image::guess_format`). Failures go to `skipped` as today. |
| `remove_file` | `id: string` | `void` | all | Also deletes the imported copy when the entry lives under `imports/`. Never deletes a user file. |
| `new_output_path` | `fileName: string` | `string` (absolute path) | all | Creates `exports/<uuid>/` and returns `exports/<uuid>/<sanitized fileName>` (file not created). |
| `new_output_dir` | — | `string` (absolute path) | all | Creates and returns an empty `exports/<uuid>/`. |
| `save_output` | `path: string`, `destination: string` | `void` | all | Stream-copies the file at `path` to `destination`. On Android `destination` is the `content://` URI returned by the save dialog. On desktop it is a normal path (atomic write). |
| `save_outputs_to_downloads` | `paths: string[]` | `SavedToDownloads` | Android | Copies each file into the public Downloads collection under `Download/Local PDF Organizer/` via `MediaStore` (API ≥ 29, no permission needed). On API < 29 or on desktop returns `AppError::Unsupported`. Name collisions get a numeric suffix by the system. |
| `share_outputs` | `paths: string[]` | `void` | Android | Opens the share sheet (`ACTION_SEND` for one file, `ACTION_SEND_MULTIPLE` for several) with `FileProvider` URIs and read grants. MIME type derived from the extension (`application/pdf`, `image/png`, `image/jpeg`, `application/zip`, mixed → `*/*`). Desktop: `AppError::Unsupported`. |
| `open_output` | `path: string` | `void` | all | Desktop: unchanged (opener). Android: `ACTION_VIEW` through `FileProvider` with a read grant; if no app can handle it, return `AppError::Unsupported` with a clear message. |
| `reveal_output` | `path: string` | `void` | desktop | Unchanged. Android: `AppError::Unsupported`. |

```ts
interface SavedToDownloads {
  /** Human-readable location, e.g. "Download/Local PDF Organizer". */
  location: string;
  count: number;
}
```

`AppError::Unsupported` serializes with `code: "unsupported"`; the frontend uses that code to fall
back, so keep it.

All existing tool commands (`merge_pdfs`, `organize_pdf`, `images_to_pdf`, `pdf_to_images`,
`compress_pdf`) keep their signatures. They simply receive an `exports/…` path on Android.

## Android plumbing (backend engineer)

- Direct dependency `tauri-plugin-fs` + `.plugin(tauri_plugin_fs::init())` (Android needs its Kotlin
  side for `getFileDescriptor`); add only the capability permissions actually required.
- One small custom Kotlin plugin registered from Rust (`register_android_plugin` /
  `run_mobile_plugin`), in the app's package (`id.local.pdforganizer`, NOT `com.localpdforganizer`),
  with commands: `getDisplayName(uri)`, `share(paths, mimeType)`, `openFile(path, mimeType)`,
  `saveToDownloads(paths, subDir)`.
- `FileProvider` in `AndroidManifest.xml` with authority `${applicationId}.fileprovider` and
  `res/xml/file_paths.xml` exposing only `<cache-path name="exports" path="exports/" />`.

## Frontend seam (frontend engineer)

`src/shared/platform/outputs.ts`:

```ts
/** Where a tool should write a single-file result. Desktop: save dialog (null = cancelled).
 *  Mobile: a fresh path in the app cache (never null). */
export function prepareOutputFile(suggestedName: string, accept?: Accept): Promise<string | null>;

/** Where a tool should write a multi-file result. Desktop: folder dialog (null = cancelled).
 *  Mobile: a fresh directory in the app cache. */
export function prepareOutputDir(): Promise<string | null>;

export function saveOutputAs(path: string, suggestedName: string): Promise<boolean>; // save dialog + save_output; false = cancelled
export function saveOutputsToDownloads(paths: string[]): Promise<SavedToDownloads>;
export function shareOutputs(paths: string[]): Promise<void>;
```

Tool pages call `prepareOutputFile` / `prepareOutputDir` instead of `pickSavePath` / `pickFolder`,
pass the produced file paths to `ResultPanel` (`outputs: string[]`), and never branch on platform
themselves. `ResultPanel` decides which actions to show:

| | Desktop | Mobile |
|---|---|---|
| Primary | Open file | **Save to Downloads** (all outputs); falls back to "Save to…" when the backend says `unsupported` |
| Other | Open folder, Start over, Continue to… | Share (all outputs), Save to… (single output only), Open (single output only), Start over, Continue to… |

Picked sources on mobile are `content://` URIs: the intake must not filter them by file extension
(the backend decides the kind) and must not show the URI to the user (use `FileInfo.name`).
