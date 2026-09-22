use std::path::PathBuf;

use tauri::State;

use crate::core::error::AppResult;
use crate::core::files::OutputInfo;
use crate::core::state::AppState;

use super::service;
use super::types::MergeSpec;

/// Gabungkan PDF (berurutan, rotasi per file) dan simpan ke `out_path`.
#[tauri::command]
pub async fn merge_pdfs(
    state: State<'_, AppState>,
    files: Vec<MergeSpec>,
    out_path: String,
) -> AppResult<OutputInfo> {
    let registry = &state.files;
    service::merge(&state.pdf, |id| registry.get(id), &files, &PathBuf::from(out_path)).await
}
