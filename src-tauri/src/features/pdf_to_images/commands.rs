use std::path::PathBuf;

use tauri::{AppHandle, State};
use uuid::Uuid;

use crate::core::error::AppResult;
use crate::core::progress::Progress;
use crate::core::state::AppState;

use super::service;
use super::types::{PdfToImagesOptions, PdfToImagesResult};

/// Render halaman PDF `file` ke folder `out_dir`.
/// Kemajuan dikirim lewat event `progress` dengan `job_id` yang diberikan frontend.
#[tauri::command]
pub async fn pdf_to_images(
    app: AppHandle,
    state: State<'_, AppState>,
    file: Uuid,
    options: PdfToImagesOptions,
    out_dir: String,
    job_id: String,
) -> AppResult<PdfToImagesResult> {
    let entry = state.files.get(file)?;
    let progress = Progress::new(app, job_id);
    service::convert(&state.pdf, &entry, &options, &PathBuf::from(out_dir), progress.callback())
        .await
}
