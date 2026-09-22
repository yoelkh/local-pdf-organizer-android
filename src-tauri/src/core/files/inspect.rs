//! Deteksi jenis file dan pembacaan metadata dasar (jumlah halaman, dimensi).

use std::path::Path;

use uuid::Uuid;

use crate::core::error::{AppError, AppResult};
use crate::core::fs;
use crate::core::pdf::engine::PdfWorkerHandle;
use crate::core::pdf::images;

use super::types::{FileEntry, FileKind};

pub const PDF_EXTENSIONS: &[&str] = &["pdf"];
pub const IMAGE_EXTENSIONS: &[&str] = &["jpg", "jpeg", "png", "webp", "bmp", "gif", "tif", "tiff"];

/// Tebak jenis file dari ekstensi. `None` bila tidak didukung.
pub fn detect_kind(path: &Path) -> Option<FileKind> {
    let ext = fs::extension_lower(path);
    if PDF_EXTENSIONS.contains(&ext.as_str()) {
        Some(FileKind::Pdf)
    } else if IMAGE_EXTENSIONS.contains(&ext.as_str()) {
        Some(FileKind::Image)
    } else {
        None
    }
}

/// Baca metadata satu file dan bentuk `FileEntry` baru (dengan id acak).
pub async fn inspect(path: &Path, pdf: &PdfWorkerHandle) -> AppResult<FileEntry> {
    fs::require_file(path)?;
    let kind = detect_kind(path)
        .ok_or_else(|| AppError::Unsupported(path.display().to_string()))?;
    let size = fs::file_size(path)?;
    let name = path
        .file_name()
        .map(|n| n.to_string_lossy().into_owned())
        .unwrap_or_default();

    let (pages, width, height) = match kind {
        FileKind::Pdf => {
            let info = pdf.inspect(path.to_path_buf()).await?;
            (info.pages, info.width, info.height)
        }
        FileKind::Image => {
            let (w, h) = images::dimensions_oriented(path)?;
            (1, w as f32, h as f32)
        }
    };

    Ok(FileEntry {
        id: Uuid::new_v4(),
        path: path.to_path_buf(),
        name,
        kind,
        size,
        pages,
        width,
        height,
    })
}
