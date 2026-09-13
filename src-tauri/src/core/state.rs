//! State global aplikasi yang dibagikan ke semua command lewat `tauri::State`.

use std::path::PathBuf;

use tauri::{AppHandle, Manager};

use crate::core::cache::CacheDir;
use crate::core::error::AppResult;
use crate::core::files::FileRegistry;
use crate::core::pdf::engine::PdfWorkerHandle;

pub struct AppState {
    pub files: FileRegistry,
    pub cache: CacheDir,
    pub pdf: PdfWorkerHandle,
}

impl AppState {
    pub fn init(app: &AppHandle) -> AppResult<Self> {
        let cache_root = app.path().app_cache_dir()?;
        let cache = CacheDir::prepare(cache_root)?;

        // Folder tambahan tempat pdfium.dll mungkin berada saat aplikasi terpasang.
        let mut extra_dirs: Vec<PathBuf> = Vec::new();
        if let Ok(res) = app.path().resource_dir() {
            extra_dirs.push(res.join("pdfium"));
            extra_dirs.push(res);
        }

        let pdf = PdfWorkerHandle::start(extra_dirs)?;

        Ok(AppState { files: FileRegistry::default(), cache, pdf })
    }
}
