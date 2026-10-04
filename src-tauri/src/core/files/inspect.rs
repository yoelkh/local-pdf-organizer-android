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

use std::io::Read;

/// Tebak jenis file dari ekstensi atau konten bila tidak dikenali.
pub fn detect_kind(path: &Path) -> Option<FileKind> {
    let ext = fs::extension_lower(path);
    if PDF_EXTENSIONS.contains(&ext.as_str()) {
        return Some(FileKind::Pdf);
    } else if IMAGE_EXTENSIONS.contains(&ext.as_str()) {
        return Some(FileKind::Image);
    }

    // Content sniffing
    let mut f = std::fs::File::open(path).ok()?;
    let mut head = [0u8; 1024];
    let n = f.read(&mut head).ok()?;
    
    if n >= 5 && &head[..5] == b"%PDF-" {
        return Some(FileKind::Pdf);
    }
    
    if image::guess_format(&head[..n]).is_ok() {
        return Some(FileKind::Image);
    }

    None
}

/// Baca metadata satu file dan bentuk `FileEntry` baru (dengan id acak).
pub async fn inspect(path: &Path, name: String, pdf: &PdfWorkerHandle) -> AppResult<FileEntry> {
    fs::require_file(path)?;
    let kind = detect_kind(path)
        .ok_or_else(|| AppError::Unsupported(path.display().to_string()))?;
    let size = fs::file_size(path)?;

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
