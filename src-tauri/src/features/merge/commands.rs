use std::path::PathBuf;

use tauri::State;
use uuid::Uuid;

use crate::core::error::AppResult;
use crate::core::files::OutputInfo;
use crate::core::state::AppState;

use super::service;

/// Gabungkan PDF dengan id `files` (berurutan) dan simpan ke `out_path`.
#[tauri::command]
pub async fn merge_pdfs(
    state: State<'_, AppState>,
    files: Vec<Uuid>,
    out_path: String,
) -> AppResult<OutputInfo> {
    let entries = state.files.get_many(&files)?;
    service::merge(&state.pdf, &entries, &PathBuf::from(out_path)).await
}
