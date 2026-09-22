use std::path::PathBuf;

use tauri::State;

use crate::core::error::{AppError, AppResult};
use crate::core::files::OutputInfo;
use crate::core::state::AppState;

use super::service;
use super::types::{ImageSpec, ImagesToPdfOptions};

/// Konversi gambar (berurutan, dengan rotasi per gambar) menjadi satu PDF di `out_path`.
#[tauri::command]
pub async fn images_to_pdf(
    state: State<'_, AppState>,
    images: Vec<ImageSpec>,
    options: ImagesToPdfOptions,
    out_path: String,
) -> AppResult<OutputInfo> {
    let registry = &state.files;
    let items = service::resolve_items(|id| registry.get(id), &images)?;
    let out = PathBuf::from(out_path);
    tauri::async_runtime::spawn_blocking(move || service::convert(&items, &options, &out))
        .await
        .map_err(|e| AppError::Internal(e.to_string()))?
}
