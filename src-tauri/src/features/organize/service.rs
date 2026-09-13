use std::path::Path;

use uuid::Uuid;

use crate::core::error::{AppError, AppResult};
use crate::core::files::{FileEntry, FileKind, OutputInfo};
use crate::core::pdf::assemble::{assemble_to_file, PageRef};
use crate::core::pdf::engine::PdfWorkerHandle;

use super::types::PageSpec;

/// Susun PDF dari `pages` dan simpan ke `out_path`.
/// `lookup` menerjemahkan id file menjadi entri registry.
pub async fn organize(
    pdf: &PdfWorkerHandle,
    lookup: impl Fn(Uuid) -> AppResult<FileEntry>,
    pages: &[PageSpec],
    out_path: &Path,
) -> AppResult<OutputInfo> {
    let refs = page_refs(lookup, pages)?;
    assemble_to_file(pdf, refs, out_path).await
}

pub fn page_refs(
    lookup: impl Fn(Uuid) -> AppResult<FileEntry>,
    pages: &[PageSpec],
) -> AppResult<Vec<PageRef>> {
    if pages.is_empty() {
        return Err(AppError::InvalidInput("no pages selected".into()));
    }
    pages
        .iter()
        .map(|spec| {
            let entry = lookup(spec.file)?;
            if entry.kind != FileKind::Pdf {
                return Err(AppError::InvalidInput(format!("{} is not a PDF", entry.name)));
            }
            if spec.page >= entry.pages {
                return Err(AppError::InvalidInput(format!(
                    "page {} does not exist in {}",
                    spec.page + 1,
                    entry.name
                )));
            }
            if spec.rotation % 90 != 0 {
                return Err(AppError::InvalidInput(format!(
                    "rotation {} is not a multiple of 90",
                    spec.rotation
                )));
            }
            Ok(PageRef {
                path: entry.path.clone(),
                page_index: spec.page,
                rotation: spec.rotation % 360,
            })
        })
        .collect()
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::path::PathBuf;

    fn entry(id: Uuid, pages: u32) -> FileEntry {
        FileEntry {
            id,
            path: PathBuf::from("doc.pdf"),
            name: "doc.pdf".into(),
            kind: FileKind::Pdf,
            size: 0,
            pages,
            width: 0.0,
            height: 0.0,
        }
    }

    #[test]
    fn page_refs_keep_order_and_normalize_rotation() {
        let id = Uuid::new_v4();
        let lookup = |wanted: Uuid| {
            if wanted == id { Ok(entry(id, 3)) } else { Err(AppError::FileNotFound("x".into())) }
        };
        let refs = page_refs(lookup, &[
            PageSpec { file: id, page: 2, rotation: 450 },
            PageSpec { file: id, page: 0, rotation: 0 },
        ]).unwrap();
        assert_eq!(refs[0].page_index, 2);
        assert_eq!(refs[0].rotation, 90);
        assert_eq!(refs[1].page_index, 0);
    }

    #[test]
    fn page_refs_reject_bad_pages() {
        let id = Uuid::new_v4();
        let lookup = move |_| Ok(entry(id, 1));
        assert!(page_refs(lookup, &[PageSpec { file: id, page: 1, rotation: 0 }]).is_err());
        assert!(page_refs(lookup, &[PageSpec { file: id, page: 0, rotation: 45 }]).is_err());
        assert!(page_refs(lookup, &[]).is_err());
    }
}
