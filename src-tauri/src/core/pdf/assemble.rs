//! Susun PDF baru dari daftar halaman sumber, dengan rotasi tambahan opsional.
//! Dipakai oleh fitur merge (semua halaman semua file) dan organize
//! (urutan/rotasi/penghapusan bebas).

use std::collections::HashMap;
use std::path::{Path, PathBuf};

use pdfium_render::prelude::*;

use crate::core::error::{AppError, AppResult};
use crate::core::files::OutputInfo;
use crate::core::fs;
use crate::core::pdf::engine::PdfWorkerHandle;

/// Satu halaman yang akan disalin ke dokumen hasil.
#[derive(Debug, Clone)]
pub struct PageRef {
    pub path: PathBuf,
    /// Indeks halaman 0-based di dokumen sumber.
    pub page_index: u32,
    /// Rotasi tambahan searah jarum jam dalam derajat (0/90/180/270).
    pub rotation: u16,
}

/// Susun PDF dari `pages` lewat worker dan tulis hasilnya ke `out_path`.
pub async fn assemble_to_file(
    pdf: &PdfWorkerHandle,
    pages: Vec<PageRef>,
    out_path: &Path,
) -> AppResult<OutputInfo> {
    let page_count = pages.len() as u32;
    let bytes = pdf.assemble(pages).await?;
    fs::write_atomic(out_path, &bytes)?;
    Ok(OutputInfo::from_path(out_path, page_count)?)
}

/// Bangun PDF baru berisi `pages` secara berurutan dan kembalikan bytes-nya.
pub fn assemble(pdfium: &Pdfium, pages: &[PageRef]) -> AppResult<Vec<u8>> {
    if pages.is_empty() {
        return Err(AppError::InvalidInput("no pages to assemble".into()));
    }

    // Buka setiap dokumen sumber sekali saja.
    let mut sources: HashMap<&PathBuf, PdfDocument> = HashMap::new();
    for page in pages {
        if !sources.contains_key(&page.path) {
            let doc = pdfium.load_pdf_from_file(&page.path, None)?;
            sources.insert(&page.path, doc);
        }
    }

    let mut dest = pdfium.create_new_pdf()?;

    for (dest_index, page) in pages.iter().enumerate() {
        let src = sources.get(&page.path).expect("source opened above");
        let count = src.pages().len() as u32;
        if page.page_index >= count {
            return Err(AppError::InvalidInput(format!(
                "page {} does not exist in {} ({} pages)",
                page.page_index + 1,
                page.path.display(),
                count
            )));
        }

        dest.pages_mut().copy_page_from_document(
            src,
            page.page_index as PdfPageIndex,
            dest_index as PdfPageIndex,
        )?;

        let extra = page.rotation % 360;
        if extra != 0 {
            let mut copied = dest.pages().get(dest_index as PdfPageIndex)?;
            let current = copied
                .rotation()
                .map(|r| r.as_degrees() as u16)
                .unwrap_or(0);
            copied.set_rotation(rotation_from_degrees((current + extra) % 360));
        }
    }

    Ok(dest.save_to_bytes()?)
}

/// Bulatkan derajat sembarang ke kelipatan 90 terdekat yang valid.
pub fn rotation_from_degrees(degrees: u16) -> PdfPageRenderRotation {
    match ((degrees % 360) + 45) / 90 % 4 {
        1 => PdfPageRenderRotation::Degrees90,
        2 => PdfPageRenderRotation::Degrees180,
        3 => PdfPageRenderRotation::Degrees270,
        _ => PdfPageRenderRotation::None,
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn rotation_rounds_to_quarter_turns() {
        assert!(matches!(rotation_from_degrees(0), PdfPageRenderRotation::None));
        assert!(matches!(rotation_from_degrees(90), PdfPageRenderRotation::Degrees90));
        assert!(matches!(rotation_from_degrees(180), PdfPageRenderRotation::Degrees180));
        assert!(matches!(rotation_from_degrees(270), PdfPageRenderRotation::Degrees270));
        assert!(matches!(rotation_from_degrees(360), PdfPageRenderRotation::None));
    }
}
