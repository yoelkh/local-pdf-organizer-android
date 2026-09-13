use std::path::Path;

use crate::core::error::AppResult;
use crate::core::fs;
use crate::core::pdf::document;

use super::image_pass;
use super::presets::Preset;
use super::types::{CompressLevel, CompressResult};

/// Kompres `input` dan tulis ke `out_path`.
/// Bila hasil tidak lebih kecil, file asli disalin apa adanya dan `unchanged = true`.
pub fn compress(input: &Path, level: CompressLevel, out_path: &Path) -> AppResult<CompressResult> {
    let original_size = fs::file_size(input)?;
    let preset = Preset::for_level(level);

    let mut doc = document::load(input)?;
    let stats = image_pass::recompress_images(&mut doc, &preset);
    document::strip_page_thumbnails(&mut doc);
    if preset.strip_metadata {
        document::strip_metadata(&mut doc);
    }
    doc.delete_zero_length_streams();
    doc.prune_objects();
    doc.compress();
    doc.renumber_objects();

    let mut buf: Vec<u8> = Vec::new();
    doc.save_to(&mut buf)?;

    let unchanged = buf.len() as u64 >= original_size;
    if unchanged {
        let original = std::fs::read(input)?;
        fs::write_atomic(out_path, &original)?;
    } else {
        fs::write_atomic(out_path, &buf)?;
    }

    Ok(CompressResult {
        path: out_path.to_string_lossy().into_owned(),
        name: out_path
            .file_name()
            .map(|n| n.to_string_lossy().into_owned())
            .unwrap_or_default(),
        original_size,
        compressed_size: fs::file_size(out_path)?,
        unchanged,
        images_processed: stats.processed,
        images_skipped: stats.skipped,
    })
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::core::pdf::document::{append_page, draw_image_content, new_blank_document, raw_xobject, page_count};
    use lopdf::Document;
    use std::path::PathBuf;
    use uuid::Uuid;

    fn temp_dir() -> PathBuf {
        let dir = std::env::temp_dir().join(format!("lpo-cmp-{}", Uuid::new_v4()));
        std::fs::create_dir_all(&dir).unwrap();
        dir
    }

    fn write_photo_pdf(path: &Path) {
        let (mut doc, pages_id) = new_blank_document();
        for _ in 0..2 {
            let img = image::RgbImage::from_fn(2000, 1500, |x, y| {
                let v = ((x * 3 + y * 5) % 253) as u8;
                image::Rgb([v, v / 2, 255 - v])
            });
            let id = doc.add_object(raw_xobject(2000, 1500, false, img.into_raw()));
            append_page(&mut doc, pages_id, 595.0, 842.0, &[("Im0", id)],
                draw_image_content("Im0", 0.0, 0.0, 595.0, 842.0)).unwrap();
        }
        doc.save(path).unwrap();
    }

    #[test]
    fn levels_shrink_monotonically_and_keep_pages() {
        let dir = temp_dir();
        let input = dir.join("photo.pdf");
        write_photo_pdf(&input);

        let mut sizes = Vec::new();
        for (i, level) in [CompressLevel::Low, CompressLevel::Recommended, CompressLevel::Extreme].into_iter().enumerate() {
            let out = dir.join(format!("out{i}.pdf"));
            let r = compress(&input, level, &out).unwrap();
            assert!(!r.unchanged);
            assert!(r.compressed_size < r.original_size);
            assert_eq!(page_count(&Document::load(&out).unwrap()), 2);
            sizes.push(r.compressed_size);
        }
        assert!(sizes[0] > sizes[1] && sizes[1] > sizes[2], "sizes: {sizes:?}");
        std::fs::remove_dir_all(dir).unwrap();
    }
}
