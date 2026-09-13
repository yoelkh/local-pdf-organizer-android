use std::path::PathBuf;

use tauri::State;
use uuid::Uuid;

use crate::core::error::{AppError, AppResult};
use crate::core::files::OutputInfo;
use crate::core::state::AppState;

use super::service;
use super::types::ImagesToPdfOptions;

/// Konversi gambar (berurutan) menjadi satu PDF di `out_path`.
#[tauri::command]
pub async fn images_to_pdf(
    state: State<'_, AppState>,
    images: Vec<Uuid>,
    options: ImagesToPdfOptions,
    out_path: String,
) -> AppResult<OutputInfo> {
    let entries = state.files.get_many(&images)?;
    let out = PathBuf::from(out_path);
    tauri::async_runtime::spawn_blocking(move || service::convert(&entries, &options, &out))
        .await
        .map_err(|e| AppError::Internal(e.to_string()))?
}
