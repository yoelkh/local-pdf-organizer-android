use std::path::PathBuf;

use tauri::State;

use crate::core::error::AppResult;
use crate::core::files::OutputInfo;
use crate::core::state::AppState;

use super::service;
use super::types::PageSpec;

/// Susun PDF baru dari daftar halaman dan simpan ke `out_path`.
#[tauri::command]
pub async fn organize_pdf(
    state: State<'_, AppState>,
    pages: Vec<PageSpec>,
    out_path: String,
) -> AppResult<OutputInfo> {
    let registry = &state.files;
    service::organize(&state.pdf, |id| registry.get(id), &pages, &PathBuf::from(out_path)).await
}
