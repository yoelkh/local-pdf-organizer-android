use std::path::{Path, PathBuf};

use tauri::{AppHandle, State};
use uuid::Uuid;

use crate::core::error::{AppError, AppResult};
use crate::core::files::{inspect, FileInfo};
use crate::core::state::AppState;
use crate::core::platform;

use super::service;
use super::types::{InspectResult, SkippedFile};

/// Daftarkan file dari path (hasil dialog atau drag-drop) ke registry.
#[tauri::command]
pub async fn inspect_files(
    app: AppHandle,
    state: State<'_, AppState>,
    paths: Vec<String>,
) -> AppResult<InspectResult> {
    let mut files: Vec<FileInfo> = Vec::new();
    let mut skipped: Vec<SkippedFile> = Vec::new();
    tracing::info!("inspect_files: {} sumber", paths.len());

    for raw in paths {
        let import_res = platform::import_file(&app, &state.cache, &raw).await;
        match import_res {
            Ok((local_path, display_name)) => {
                match inspect::inspect(&local_path, display_name.clone(), &state.pdf).await {
                    Ok(mut entry) => {
                        entry.name = display_name;
                        files.push(FileInfo::from(&entry));
                        state.files.insert(entry);
                    }
                    Err(e) => {
                        tracing::warn!("inspect gagal: {e}");
                        skipped.push(SkippedFile { path: raw, reason: e.to_string() });
                    }
                }
            }
            Err(e) => {
                tracing::warn!("impor gagal: {e}");
                skipped.push(SkippedFile { path: raw, reason: e.to_string() });
            }
        }
    }

    tracing::info!("inspect_files: {} diterima, {} dilewati", files.len(), skipped.len());
    Ok(InspectResult { files, skipped })
}

/// Lepaskan file dari registry dan buang thumbnail-nya.
#[tauri::command]
pub async fn remove_file(state: State<'_, AppState>, id: Uuid) -> AppResult<()> {
    if let Some(entry) = state.files.remove(id) {
        state.cache.forget_file(id);
        // Also remove local imported copy if under imports/
        if let Ok(imports_dir) = std::fs::canonicalize(state.cache.imports_dir()) {
            if let Ok(target) = std::fs::canonicalize(&entry.path) {
                if target.starts_with(imports_dir) {
                    if let Some(parent) = entry.path.parent() {
                        let _ = std::fs::remove_dir_all(parent);
                    }
                }
            }
        }
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

#[tauri::command]
pub async fn new_output_path(state: State<'_, AppState>, file_name: String) -> AppResult<String> {
    let path = platform::new_output_path(&state.cache, &file_name)?;
    Ok(path.to_string_lossy().into_owned())
}

#[tauri::command]
pub async fn new_output_dir(state: State<'_, AppState>) -> AppResult<String> {
    let path = platform::new_output_dir(&state.cache)?;
    Ok(path.to_string_lossy().into_owned())
}

#[tauri::command]
pub async fn save_output(app: AppHandle, state: State<'_, AppState>, path: String, destination: String) -> AppResult<()> {
    let src = PathBuf::from(&path);
    platform::check_inside_exports(&state.cache, &src)?;
    
    if destination.starts_with("content://") {
        #[cfg(target_os = "android")]
        {
            let dest_clone = destination.clone();
            let src_clone = src.clone();
            let app_clone = app.clone();
            tauri::async_runtime::spawn_blocking(move || -> AppResult<()> {
                let mut opts = tauri_plugin_fs::OpenOptions::new();
                opts.write(true).truncate(true);
                let url = url::Url::parse(&dest_clone).map_err(|e| AppError::Internal(e.to_string()))?;
                let mut dest_file = tauri_plugin_fs::FsExt::fs(&app_clone).open(tauri_plugin_fs::FilePath::Url(url), opts)
                    .map_err(|e| AppError::Internal(e.to_string()))?;
                let mut src_file = std::fs::File::open(&src_clone)?;
                std::io::copy(&mut src_file, &mut dest_file)?;
                Ok(())
            }).await.map_err(|e| AppError::Internal(e.to_string()))??;
        }
        #[cfg(not(target_os = "android"))]
        {
            let _ = app;
            return Err(AppError::Unsupported("save_output to content://".into()));
        }
    } else {
        #[cfg(not(target_os = "android"))]
        let _ = app;
        let dest = PathBuf::from(&destination);
        platform::save_output_local(&state.cache, &src, &dest)?;
    }
    Ok(())
}

#[tauri::command]
pub async fn save_outputs_to_downloads(app: AppHandle, state: State<'_, AppState>, paths: Vec<String>) -> AppResult<platform::SavedToDownloads> {
    for path in &paths {
        platform::check_inside_exports(&state.cache, Path::new(path))?;
    }
    platform::save_outputs_to_downloads(&app, paths).await
}

#[tauri::command]
pub async fn share_outputs(app: AppHandle, state: State<'_, AppState>, paths: Vec<String>) -> AppResult<()> {
    for path in &paths {
        platform::check_inside_exports(&state.cache, Path::new(path))?;
    }
    platform::share_outputs(&app, paths).await
}

#[tauri::command]
pub async fn open_output(app: AppHandle, _state: State<'_, AppState>, path: String) -> AppResult<()> {
    #[cfg(target_os = "android")]
    platform::check_inside_exports(&_state.cache, Path::new(&path))?;
    
    platform::open_output(&app, &path).await
}

#[tauri::command]
pub async fn reveal_output(app: AppHandle, path: String) -> AppResult<()> {
    platform::reveal_output(&app, &path).await
}
