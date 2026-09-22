use std::path::Path;

use uuid::Uuid;

use crate::core::error::{AppError, AppResult};
use crate::core::files::{FileEntry, FileKind, OutputInfo};
use crate::core::pdf::assemble::{assemble_to_file, PageRef};
use crate::core::pdf::engine::PdfWorkerHandle;

use super::types::MergeSpec;

/// Gabungkan semua halaman dari `specs` (sesuai urutan) ke `out_path`.
pub async fn merge(
    pdf: &PdfWorkerHandle,
    lookup: impl Fn(Uuid) -> AppResult<FileEntry>,
    specs: &[MergeSpec],
    out_path: &Path,
) -> AppResult<OutputInfo> {
    let pages = page_refs(lookup, specs)?;
    assemble_to_file(pdf, pages, out_path).await
}

/// Semua halaman dari setiap file, dengan rotasi per file.
pub fn page_refs(
    lookup: impl Fn(Uuid) -> AppResult<FileEntry>,
    specs: &[MergeSpec],
) -> AppResult<Vec<PageRef>> {
    if specs.is_empty() {
        return Err(AppError::InvalidInput("no files to merge".into()));
    }
    let mut pages = Vec::new();
    for spec in specs {
        let file = lookup(spec.file)?;
        if file.kind != FileKind::Pdf {
            return Err(AppError::InvalidInput(format!("{} is not a PDF", file.name)));
        }
        if spec.rotation % 90 != 0 {
            return Err(AppError::InvalidInput(format!(
                "rotation {} is not a multiple of 90",
                spec.rotation
            )));
        }
        for index in 0..file.pages {
            pages.push(PageRef { path: file.path.clone(), page_index: index, rotation: spec.rotation % 360 });
        }
    }
    Ok(pages)
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::collections::HashMap;
    use std::path::PathBuf;

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

    fn lookup_of(entries: Vec<FileEntry>) -> impl Fn(Uuid) -> AppResult<FileEntry> {
        let map: HashMap<Uuid, FileEntry> = entries.into_iter().map(|e| (e.id, e)).collect();
        move |id| map.get(&id).cloned().ok_or_else(|| AppError::FileNotFound(id.to_string()))
    }

    #[test]
    fn page_refs_expand_every_page_in_order_with_rotation() {
        let a = entry("a.pdf", 2, FileKind::Pdf);
        let b = entry("b.pdf", 1, FileKind::Pdf);
        let specs = vec![MergeSpec { file: a.id, rotation: 90 }, MergeSpec { file: b.id, rotation: 0 }];
        let refs = page_refs(lookup_of(vec![a, b]), &specs).unwrap();
        let summary: Vec<(String, u32, u16)> = refs
            .iter()
            .map(|r| (r.path.to_string_lossy().into_owned(), r.page_index, r.rotation))
            .collect();
        assert_eq!(
            summary,
            vec![("a.pdf".into(), 0, 90), ("a.pdf".into(), 1, 90), ("b.pdf".into(), 0, 0)]
        );
    }

    #[test]
    fn page_refs_reject_images_and_bad_rotation() {
        let img = entry("x.png", 1, FileKind::Image);
        let pdf = entry("y.pdf", 1, FileKind::Pdf);
        let img_id = img.id;
        let pdf_id = pdf.id;
        let lookup = lookup_of(vec![img, pdf]);
        assert!(page_refs(&lookup, &[MergeSpec { file: img_id, rotation: 0 }]).is_err());
        assert!(page_refs(&lookup, &[MergeSpec { file: pdf_id, rotation: 30 }]).is_err());
        assert!(page_refs(&lookup, &[]).is_err());
    }
}
