//! Render satu halaman PDF menjadi gambar.

use image::DynamicImage;
use pdfium_render::prelude::*;

use crate::core::error::{AppError, AppResult};

use super::engine::RenderTarget;

/// Render halaman `page_index` (0-based) dengan ukuran sesuai `target`.
/// Latar belakang putih; rotasi `/Rotate` halaman sudah diperhitungkan PDFium.
pub fn render_page(
    doc: &PdfDocument,
    page_index: u32,
    target: RenderTarget,
) -> AppResult<DynamicImage> {
    let pages = doc.pages();
    let count = pages.len() as u32;
    if page_index >= count {
        return Err(AppError::InvalidInput(format!(
            "page index {page_index} out of range (document has {count} pages)"
        )));
    }

    let page = pages.get(page_index as PdfPageIndex)?;
    let width_pt = page.width().value.max(1.0);
    let target_px = match target {
        RenderTarget::Width(w) => w,
        RenderTarget::Dpi(dpi) => (width_pt * dpi / 72.0).round() as u32,
    }
    .clamp(1, 20_000);

    let config = PdfRenderConfig::new()
        .set_target_width(target_px as Pixels)
        .set_clear_color(PdfColor::WHITE)
        .render_form_data(true);

    let bitmap = page.render_with_config(&config)?;
    let image = bitmap.as_image()?;
    // Buang kanal alpha: latar sudah putih, file jadi lebih kecil.
    Ok(DynamicImage::ImageRgb8(image.to_rgb8()))
}
