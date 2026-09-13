use std::path::PathBuf;

use tauri::{AppHandle, State};
use tauri_plugin_opener::OpenerExt;
use uuid::Uuid;

use crate::core::error::{AppError, AppResult};
use crate::core::files::{inspect, FileInfo};
use crate::core::state::AppState;

use super::service;
use super::types::{InspectResult, SkippedFile};

/// Daftarkan file dari path (hasil dialog atau drag-drop) ke registry.
#[tauri::command]
pub async fn inspect_files(
    state: State<'_, AppState>,
    paths: Vec<String>,
) -> AppResult<InspectResult> {
    let mut files: Vec<FileInfo> = Vec::new();
    let mut skipped: Vec<SkippedFile> = Vec::new();

    for raw in paths {
        let path = PathBuf::from(&raw);
        match inspect::inspect(&path, &state.pdf).await {
            Ok(entry) => {
                files.push(FileInfo::from(&entry));
                state.files.insert(entry);
            }
            Err(e) => skipped.push(SkippedFile { path: raw, reason: e.to_string() }),
        }
    }

    Ok(InspectResult { files, skipped })
}

/// Lepaskan file dari registry dan buang thumbnail-nya.
#[tauri::command]
pub async fn remove_file(state: State<'_, AppState>, id: Uuid) -> AppResult<()> {
    if state.files.remove(id).is_some() {
        state.cache.forget_file(id);
    }
    Ok(())
}

/// Path PNG thumbnail untuk halaman `page` (0-based) dengan lebar `width` piksel.
#[tauri::command]
pub async fn render_thumbnail(
    state: State<'_, AppState>,
    id: Uuid,
    page: u32,
    width: u32,
) -> AppResult<String> {
    let entry = state.files.get(id)?;
    let path = service::thumbnail(&state.pdf, &state.cache, &entry, page, width).await?;
    Ok(path.to_string_lossy().into_owned())
}

/// Buka file/folder hasil dengan aplikasi default (dijalankan dari sisi Rust
/// supaya tidak terbentur scope izin plugin opener di sisi JS).
#[tauri::command]
pub async fn open_output(app: AppHandle, path: String) -> AppResult<()> {
    let target = PathBuf::from(&path);
    if !target.exists() {
        return Err(AppError::FileNotFound(path));
    }
    app.opener()
        .open_path(path, None::<&str>)
        .map_err(|e| AppError::Internal(e.to_string()))
}

/// Tampilkan file hasil di File Explorer.
#[tauri::command]
pub async fn reveal_output(app: AppHandle, path: String) -> AppResult<()> {
    let target = PathBuf::from(&path);
    if !target.exists() {
        return Err(AppError::FileNotFound(path));
    }
    app.opener()
        .reveal_item_in_dir(target)
        .map_err(|e| AppError::Internal(e.to_string()))
}
