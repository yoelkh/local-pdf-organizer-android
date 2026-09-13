use std::path::{Path, PathBuf};

use image::DynamicImage;

use crate::core::cache::CacheDir;
use crate::core::error::AppResult;
use crate::core::files::{FileEntry, FileKind};
use crate::core::fs;
use crate::core::pdf::engine::{PdfWorkerHandle, RenderTarget};
use crate::core::pdf::images;

pub const MIN_THUMB_WIDTH: u32 = 32;
pub const MAX_THUMB_WIDTH: u32 = 2400;

/// Render (atau ambil dari cache) thumbnail PNG untuk halaman `page` (0-based).
/// Mengembalikan path file PNG di folder cache.
pub async fn thumbnail(
    pdf: &PdfWorkerHandle,
    cache: &CacheDir,
    entry: &FileEntry,
    page: u32,
    width: u32,
) -> AppResult<PathBuf> {
    let width = width.clamp(MIN_THUMB_WIDTH, MAX_THUMB_WIDTH);
    let target = cache.thumb_path(entry.id, page, width);
    if target.is_file() {
        return Ok(target);
    }

    let image: DynamicImage = match entry.kind {
        FileKind::Pdf => {
            pdf.render_page(entry.path.clone(), page, RenderTarget::Width(width))
                .await?
        }
        FileKind::Image => {
            let path = entry.path.clone();
            tauri::async_runtime::spawn_blocking(move || -> AppResult<DynamicImage> {
                let decoded = images::decode_file(&path)?;
                let flat = DynamicImage::ImageRgb8(images::flatten_to_rgb(&decoded.image));
                Ok(images::thumbnail_width(&flat, width))
            })
            .await
            .map_err(|e| crate::core::error::AppError::Internal(e.to_string()))??
        }
    };

    write_png(&target, &image).await?;
    Ok(target)
}

async fn write_png(target: &Path, image: &DynamicImage) -> AppResult<()> {
    let target = target.to_path_buf();
    let image = image.clone();
    tauri::async_runtime::spawn_blocking(move || -> AppResult<()> {
        let png = images::encode_png(&image)?;
        fs::write_atomic(&target, &png)
    })
    .await
    .map_err(|e| crate::core::error::AppError::Internal(e.to_string()))?
}
