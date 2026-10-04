use std::path::PathBuf;
use tauri::AppHandle;
use serde::Serialize;
use crate::core::error::{AppError, AppResult};
use crate::core::cache::CacheDir;

pub mod export;
pub mod import;

#[cfg(target_os = "android")]
pub mod android;

pub use export::{check_inside_exports, new_output_dir, new_output_path, save_output_local, determine_mime_type};
pub use import::import_file_local;

pub fn init_plugin<R: tauri::Runtime>() -> tauri::plugin::TauriPlugin<R> {
    tauri::plugin::Builder::new("fileio")
        .setup(|_app, _api| {
            #[cfg(target_os = "android")]
            {
                use tauri::Manager;
                let handle = _api.register_android_plugin("id.local.pdforganizer", "FileIoPlugin")?;
                _app.manage(android::FileIo(handle));
            }
            Ok(())
        })
        .build()
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct SavedToDownloads {
    pub location: String,
    pub count: usize,
}

/// Mengimpor file dari URI (path lokal atau content://).
#[cfg(not(target_os = "android"))]
pub async fn import_file(_app: &AppHandle, _cache: &CacheDir, uri: &str) -> AppResult<(PathBuf, String)> {
    import_file_local(uri)
}

/// Mengimpor file dari URI (path lokal atau content://).
#[cfg(target_os = "android")]
pub async fn import_file(app: &AppHandle, cache: &CacheDir, uri: &str) -> AppResult<(PathBuf, String)> {
    android::import_file(app, cache, uri).await
}

/// Menyimpan banyak file output ke direktori Downloads.
#[cfg(not(target_os = "android"))]
pub async fn save_outputs_to_downloads(_app: &AppHandle, _paths: Vec<String>) -> AppResult<SavedToDownloads> {
    Err(AppError::Unsupported("save_outputs_to_downloads".into()))
}

/// Menyimpan banyak file output ke direktori Downloads.
#[cfg(target_os = "android")]
pub async fn save_outputs_to_downloads(app: &AppHandle, paths: Vec<String>) -> AppResult<SavedToDownloads> {
    android::save_outputs_to_downloads(app, paths).await
}

/// Membagikan banyak file output ke aplikasi lain.
#[cfg(not(target_os = "android"))]
pub async fn share_outputs(_app: &AppHandle, _paths: Vec<String>) -> AppResult<()> {
    Err(AppError::Unsupported("share_outputs".into()))
}

/// Membagikan banyak file output ke aplikasi lain.
#[cfg(target_os = "android")]
pub async fn share_outputs(app: &AppHandle, paths: Vec<String>) -> AppResult<()> {
    android::share_outputs(app, paths).await
}

/// Membuka file output di aplikasi default.
#[cfg(not(target_os = "android"))]
pub async fn open_output(app: &AppHandle, path: &str) -> AppResult<()> {
    use tauri_plugin_opener::OpenerExt;
    let target = PathBuf::from(path);
    if !target.exists() {
        return Err(AppError::FileNotFound(path.to_string()));
    }
    app.opener()
        .open_path(path.to_string(), None::<&str>)
        .map_err(|e| AppError::Internal(e.to_string()))
}

/// Membuka file output di aplikasi default.
#[cfg(target_os = "android")]
pub async fn open_output(app: &AppHandle, path: &str) -> AppResult<()> {
    android::open_output(app, path).await
}

/// Menampilkan file output di file manager.
#[cfg(not(target_os = "android"))]
pub async fn reveal_output(app: &AppHandle, path: &str) -> AppResult<()> {
    use tauri_plugin_opener::OpenerExt;
    let target = PathBuf::from(path);
    if !target.exists() {
        return Err(AppError::FileNotFound(path.to_string()));
    }
    app.opener()
        .reveal_item_in_dir(target)
        .map_err(|e| AppError::Internal(e.to_string()))
}

/// Menampilkan file output di file manager.
#[cfg(target_os = "android")]
pub async fn reveal_output(_app: &AppHandle, _path: &str) -> AppResult<()> {
    Err(AppError::Unsupported("reveal_output".into()))
}
