use std::path::Path;

use crate::core::error::{AppError, AppResult};
use crate::core::files::{FileEntry, FileKind, OutputInfo};
use crate::core::pdf::assemble::{assemble_to_file, PageRef};
use crate::core::pdf::engine::PdfWorkerHandle;

/// Gabungkan semua halaman dari `files` (sesuai urutan) ke `out_path`.
pub async fn merge(
    pdf: &PdfWorkerHandle,
    files: &[FileEntry],
    out_path: &Path,
) -> AppResult<OutputInfo> {
    if files.is_empty() {
        return Err(AppError::InvalidInput("no files to merge".into()));
    }
    let pages = page_refs(files)?;
    assemble_to_file(pdf, pages, out_path).await
}

/// Semua halaman dari setiap file, rotasi 0.
pub fn page_refs(files: &[FileEntry]) -> AppResult<Vec<PageRef>> {
    let mut pages = Vec::new();
    for file in files {
        if file.kind != FileKind::Pdf {
            return Err(AppError::InvalidInput(format!("{} is not a PDF", file.name)));
        }
        for index in 0..file.pages {
            pages.push(PageRef { path: file.path.clone(), page_index: index, rotation: 0 });
        }
    }
    Ok(pages)
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::path::PathBuf;
    use uuid::Uuid;

    fn entry(name: &str, pages: u32, kind: FileKind) -> FileEntry {
        FileEntry {
            id: Uuid::new_v4(),
            path: PathBuf::from(name),
            name: name.into(),
            kind,
            size: 0,
            pages,
            width: 0.0,
            height: 0.0,
        }
    }

    #[test]
    fn page_refs_expand_every_page_in_order() {
        let refs = page_refs(&[entry("a.pdf", 2, FileKind::Pdf), entry("b.pdf", 1, FileKind::Pdf)])
            .unwrap();
        let summary: Vec<(String, u32)> = refs
            .iter()
            .map(|r| (r.path.to_string_lossy().into_owned(), r.page_index))
            .collect();
        assert_eq!(summary, vec![("a.pdf".into(), 0), ("a.pdf".into(), 1), ("b.pdf".into(), 0)]);
    }

    #[test]
    fn page_refs_reject_images() {
        assert!(page_refs(&[entry("x.png", 1, FileKind::Image)]).is_err());
    }
}
