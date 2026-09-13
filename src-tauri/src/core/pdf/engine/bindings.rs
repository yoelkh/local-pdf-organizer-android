//! Pencarian dan pemuatan `pdfium.dll`.

use std::path::PathBuf;

use pdfium_render::prelude::*;

use crate::core::error::{AppError, AppResult};

/// Urutan folder yang dicoba untuk menemukan `pdfium.dll`:
/// 1. `PDFIUM_DIR` (env, untuk override manual)
/// 2. folder exe dan `<exe>/pdfium`
/// 3. folder tambahan dari pemanggil (resource dir Tauri)
/// 4. `<repo>/src-tauri/pdfium` (hanya berguna saat development)
pub fn candidate_dirs(extra: &[PathBuf]) -> Vec<PathBuf> {
    let mut dirs: Vec<PathBuf> = Vec::new();

    if let Ok(dir) = std::env::var("PDFIUM_DIR") {
        dirs.push(PathBuf::from(dir));
    }

    if let Ok(exe) = std::env::current_exe() {
        if let Some(exe_dir) = exe.parent() {
            dirs.push(exe_dir.to_path_buf());
            dirs.push(exe_dir.join("pdfium"));
        }
    }

    dirs.extend(extra.iter().cloned());
    dirs.push(PathBuf::from(env!("CARGO_MANIFEST_DIR")).join("pdfium"));

    dirs.dedup();
    dirs
}

/// Muat PDFium dari salah satu folder kandidat, atau dari library sistem.
/// Mengembalikan instance `Pdfium` dan lokasi library yang berhasil dimuat.
pub fn bind(extra: &[PathBuf]) -> AppResult<(Pdfium, String)> {
    let mut tried: Vec<String> = Vec::new();

    for dir in candidate_dirs(extra) {
        let lib = Pdfium::pdfium_platform_library_name_at_path(&dir);
        if !lib.is_file() {
            continue;
        }
        match Pdfium::bind_to_library(&lib) {
            Ok(bindings) => {
                return Ok((Pdfium::new(bindings), lib.display().to_string()));
            }
            Err(e) => tried.push(format!("{}: {e}", lib.display())),
        }
    }

    match Pdfium::bind_to_system_library() {
        Ok(bindings) => Ok((Pdfium::new(bindings), "system library".to_string())),
        Err(e) => {
            tried.push(format!("system: {e}"));
            Err(AppError::Engine(format!(
                "pdfium.dll tidak ditemukan. Dicoba: {}",
                tried.join("; ")
            )))
        }
    }
}
