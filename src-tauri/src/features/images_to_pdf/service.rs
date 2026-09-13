use std::path::Path;

use image::{GenericImageView, ImageFormat};
use lopdf::Stream;

use crate::core::error::{AppError, AppResult};
use crate::core::files::{FileEntry, FileKind, OutputInfo};
use crate::core::pdf::document;
use crate::core::pdf::images;

use super::layout;
use super::types::ImagesToPdfOptions;

/// Bentuk PDF dengan satu halaman per gambar dan simpan ke `out_path`.
pub fn convert(
    files: &[FileEntry],
    opts: &ImagesToPdfOptions,
    out_path: &Path,
) -> AppResult<OutputInfo> {
    if files.is_empty() {
        return Err(AppError::InvalidInput("no images selected".into()));
    }

    let (mut doc, pages_id) = document::new_blank_document();

    for file in files {
        if file.kind != FileKind::Image {
            return Err(AppError::InvalidInput(format!("{} is not an image", file.name)));
        }
        let bytes = std::fs::read(&file.path)?;
        let (xobject, width, height) = build_xobject(&bytes)
            .map_err(|e| AppError::Image(format!("{}: {e}", file.name)))?;
        let image_id = doc.add_object(xobject);

        let l = layout::compute(width, height, opts);
        let content = document::draw_image_content("Im0", l.x, l.y, l.width, l.height);
        document::append_page(
            &mut doc,
            pages_id,
            l.page_width,
            l.page_height,
            &[("Im0", image_id)],
            content,
        )?;
    }

    doc.compress();
    document::save(&mut doc, out_path)?;
    Ok(OutputInfo::from_path(out_path, files.len() as u32)?)
}

/// Pilih representasi paling hemat yang tetap setia pada gambar asal:
/// - JPEG RGB/gray tanpa rotasi EXIF → bytes asli disematkan apa adanya (DCTDecode)
/// - selain itu → sampel mentah (gray atau RGB), alpha diratakan ke putih, di-Flate
fn build_xobject(bytes: &[u8]) -> AppResult<(Stream, u32, u32)> {
    let decoded = images::decode(bytes)?;
    let (w, h) = decoded.image.dimensions();

    let plain_jpeg = decoded.format == Some(ImageFormat::Jpeg)
        && !decoded.reoriented
        && matches!(images::jpeg_components(bytes), Some(1) | Some(3));

    if plain_jpeg {
        let gray = images::jpeg_components(bytes) == Some(1);
        return Ok((document::jpeg_xobject(w, h, gray, bytes.to_vec()), w, h));
    }

    let stream = if images::is_grayscale(&decoded.image) {
        let gray = images::flatten_to_gray(&decoded.image);
        document::raw_xobject(w, h, true, gray.into_raw())
    } else {
        let rgb = images::flatten_to_rgb(&decoded.image);
        document::raw_xobject(w, h, false, rgb.into_raw())
    };
    Ok((stream, w, h))
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::core::pdf::document::page_count;
    use image::DynamicImage;
    use lopdf::Document;
    use std::path::PathBuf;
    use uuid::Uuid;

    fn temp_dir() -> PathBuf {
        let dir = std::env::temp_dir().join(format!("lpo-i2p-{}", Uuid::new_v4()));
        std::fs::create_dir_all(&dir).unwrap();
        dir
    }

    fn write_image(dir: &Path, name: &str, img: &DynamicImage, format: ImageFormat) -> FileEntry {
        let path = dir.join(name);
        img.save_with_format(&path, format).unwrap();
        let (w, h) = img.dimensions();
        FileEntry {
            id: Uuid::new_v4(),
            path,
            name: name.into(),
            kind: FileKind::Image,
            size: 0,
            pages: 1,
            width: w as f32,
            height: h as f32,
        }
    }

    #[test]
    fn one_page_per_image_and_jpeg_kept_as_dct() {
        let dir = temp_dir();
        let rgb = DynamicImage::ImageRgb8(image::RgbImage::from_fn(64, 32, |x, _| {
            image::Rgb([x as u8 * 4, 20, 200])
        }));
        let rgba = DynamicImage::ImageRgba8(image::RgbaImage::from_pixel(10, 10, image::Rgba([0, 0, 0, 0])));
        let files = vec![
            write_image(&dir, "a.jpg", &rgb, ImageFormat::Jpeg),
            write_image(&dir, "b.png", &rgba, ImageFormat::Png),
        ];
        let out = dir.join("out.pdf");
        let info = convert(&files, &ImagesToPdfOptions::default(), &out).unwrap();
        assert_eq!(info.pages, 2);

        let doc = Document::load(&out).unwrap();
        assert_eq!(page_count(&doc), 2);
        let filters: Vec<String> = document::image_xobject_ids(&doc)
            .into_iter()
            .map(|id| {
                let s = doc.get_object(id).unwrap().as_stream().unwrap();
                s.filters().map(|f| String::from_utf8_lossy(f[0]).into_owned()).unwrap_or_default()
            })
            .collect();
        assert!(filters.contains(&"DCTDecode".to_string()));
        assert!(filters.contains(&"FlateDecode".to_string()));
        std::fs::remove_dir_all(dir).unwrap();
    }
}
