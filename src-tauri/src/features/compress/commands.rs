use std::path::PathBuf;

use tauri::State;
use uuid::Uuid;

use crate::core::error::{AppError, AppResult};
use crate::core::state::AppState;

use super::service;
use super::types::{CompressLevel, CompressResult};

/// Kompres PDF `file` dengan `level` dan simpan ke `out_path`.
#[tauri::command]
pub async fn compress_pdf(
    state: State<'_, AppState>,
    file: Uuid,
    level: CompressLevel,
    out_path: String,
) -> AppResult<CompressResult> {
    let entry = state.files.get(file)?;
    let out = PathBuf::from(out_path);
    tauri::async_runtime::spawn_blocking(move || service::compress(&entry.path, level, &out))
        .await
        .map_err(|e| AppError::Internal(e.to_string()))?
}
