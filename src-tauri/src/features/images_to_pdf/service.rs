use std::path::Path;

use image::{GenericImageView, ImageFormat};
use lopdf::Stream;
use uuid::Uuid;

use crate::core::error::{AppError, AppResult};
use crate::core::files::{FileEntry, FileKind, OutputInfo};
use crate::core::pdf::document;
use crate::core::pdf::images;

use super::layout;
use super::types::{ImageSpec, ImagesToPdfOptions};

/// Gambar yang sudah divalidasi dan siap disusun.
#[derive(Debug, Clone)]
pub struct ImageItem {
    pub entry: FileEntry,
    /// Rotasi pengguna searah jarum jam (0/90/180/270).
    pub rotation: u16,
}

/// Terjemahkan `ImageSpec` dari frontend menjadi entri file + rotasi yang valid.
pub fn resolve_items(
    lookup: impl Fn(Uuid) -> AppResult<FileEntry>,
    specs: &[ImageSpec],
) -> AppResult<Vec<ImageItem>> {
    if specs.is_empty() {
        return Err(AppError::InvalidInput("no images selected".into()));
    }
    specs
        .iter()
        .map(|spec| {
            let entry = lookup(spec.file)?;
            if entry.kind != FileKind::Image {
                return Err(AppError::InvalidInput(format!("{} is not an image", entry.name)));
            }
            if spec.rotation % 90 != 0 {
                return Err(AppError::InvalidInput(format!(
                    "rotation {} is not a multiple of 90",
                    spec.rotation
                )));
            }
            Ok(ImageItem { entry, rotation: spec.rotation % 360 })
        })
        .collect()
}

/// Bentuk PDF dengan satu halaman per gambar dan simpan ke `out_path`.
pub fn convert(items: &[ImageItem], opts: &ImagesToPdfOptions, out_path: &Path) -> AppResult<OutputInfo> {
    if items.is_empty() {
        return Err(AppError::InvalidInput("no images selected".into()));
    }

    let (mut doc, pages_id) = document::new_blank_document();

    for item in items {
        let bytes = std::fs::read(&item.entry.path)?;
        let built = build_xobject(&bytes)
            .map_err(|e| AppError::Image(format!("{}: {e}", item.entry.name)))?;
        let image_id = doc.add_object(built.stream);

        // Rotasi total yang diterapkan pada sampel mentah XObject.
        let rotation = (built.base_rotation + item.rotation) % 360;
        let sideways = rotation % 180 != 0;
        let (box_w, box_h) = if sideways {
            (built.height, built.width)
        } else {
            (built.width, built.height)
        };

        let l = layout::compute(box_w, box_h, opts);
        let content = document::draw_image_content_rotated("Im0", l.x, l.y, l.width, l.height, rotation);
        document::append_page(&mut doc, pages_id, l.page_width, l.page_height, &[("Im0", image_id)], content)?;
    }

    doc.compress();
    document::save(&mut doc, out_path)?;
    Ok(OutputInfo::from_path(out_path, items.len() as u32)?)
}

/// XObject gambar beserta dimensi sampel mentahnya dan rotasi dasar yang harus
/// diterapkan agar tampil tegak (dari EXIF, bila bytes asli disematkan apa adanya).
struct BuiltImage {
    stream: Stream,
    width: u32,
    height: u32,
    base_rotation: u16,
}

/// Pilih representasi paling hemat yang tetap setia pada gambar asal:
/// - JPEG RGB/gray (termasuk yang EXIF-nya hanya rotasi) → bytes asli disematkan
///   apa adanya (DCTDecode); rotasi EXIF dipindahkan ke matriks `cm`.
/// - selain itu → sampel mentah yang sudah dikoreksi orientasinya (gray atau RGB),
///   alpha diratakan ke putih, di-Flate.
fn build_xobject(bytes: &[u8]) -> AppResult<BuiltImage> {
    let decoded = images::decode(bytes)?;
    let (ow, oh) = decoded.image.dimensions();

    let exif_rotation = images::orientation_degrees(decoded.orientation);
    let components = images::jpeg_components(bytes);
    let plain_jpeg =
        decoded.format == Some(ImageFormat::Jpeg) && exif_rotation.is_some() && matches!(components, Some(1) | Some(3));

    if plain_jpeg {
        let base_rotation = exif_rotation.unwrap_or(0);
        // Dimensi sampel mentah = dimensi tampil sebelum koreksi EXIF.
        let (rw, rh) = if base_rotation % 180 != 0 { (oh, ow) } else { (ow, oh) };
        let gray = components == Some(1);
        return Ok(BuiltImage {
            stream: document::jpeg_xobject(rw, rh, gray, bytes.to_vec()),
            width: rw,
            height: rh,
            base_rotation,
        });
    }

    let stream = if images::is_grayscale(&decoded.image) {
        let gray = images::flatten_to_gray(&decoded.image);
        document::raw_xobject(ow, oh, true, gray.into_raw())
    } else {
        let rgb = images::flatten_to_rgb(&decoded.image);
        document::raw_xobject(ow, oh, false, rgb.into_raw())
    };
    Ok(BuiltImage { stream, width: ow, height: oh, base_rotation: 0 })
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::core::pdf::document::page_count;
    use image::codecs::jpeg::JpegEncoder;
    use image::{DynamicImage, ImageEncoder};
    use lopdf::{Document, Object};
    use std::path::PathBuf;

    fn temp_dir() -> PathBuf {
        let dir = std::env::temp_dir().join(format!("lpo-i2p-{}", Uuid::new_v4()));
        std::fs::create_dir_all(&dir).unwrap();
        dir
    }

    fn entry(path: PathBuf, w: u32, h: u32) -> FileEntry {
        FileEntry {
            id: Uuid::new_v4(),
            name: path.file_name().unwrap().to_string_lossy().into_owned(),
            path,
            kind: FileKind::Image,
            size: 0,
            pages: 1,
            width: w as f32,
            height: h as f32,
        }
    }

    fn write_image(dir: &Path, name: &str, img: &DynamicImage, format: ImageFormat) -> FileEntry {
        let path = dir.join(name);
        img.save_with_format(&path, format).unwrap();
        let (w, h) = img.dimensions();
        entry(path, w, h)
    }

    /// TIFF minimal berisi satu tag Orientation (0x0112) = `value`.
    fn exif_orientation_blob(value: u16) -> Vec<u8> {
        let mut b = Vec::new();
        b.extend_from_slice(b"II*\0");
        b.extend_from_slice(&8u32.to_le_bytes());
        b.extend_from_slice(&1u16.to_le_bytes());
        b.extend_from_slice(&0x0112u16.to_le_bytes());
        b.extend_from_slice(&3u16.to_le_bytes());
        b.extend_from_slice(&1u32.to_le_bytes());
        b.extend_from_slice(&value.to_le_bytes());
        b.extend_from_slice(&0u16.to_le_bytes());
        b.extend_from_slice(&0u32.to_le_bytes());
        b
    }

    fn write_exif_jpeg(dir: &Path, name: &str, w: u32, h: u32, orientation: u16) -> FileEntry {
        let img = image::RgbImage::from_fn(w, h, |x, y| image::Rgb([(x % 256) as u8, (y % 256) as u8, 90]));
        let mut buf = Vec::new();
        let mut enc = JpegEncoder::new_with_quality(&mut buf, 85);
        enc.set_exif_metadata(exif_orientation_blob(orientation)).unwrap();
        enc.write_image(img.as_raw(), w, h, image::ExtendedColorType::Rgb8).unwrap();
        let path = dir.join(name);
        std::fs::write(&path, &buf).unwrap();
        entry(path, w, h)
    }

    fn media_boxes(doc: &Document) -> Vec<(f32, f32)> {
        doc.page_iter()
            .map(|id| {
                let page = doc.get_dictionary(id).unwrap();
                let mb = page.get(b"MediaBox").unwrap().as_array().unwrap();
                (mb[2].as_float().unwrap(), mb[3].as_float().unwrap())
            })
            .collect()
    }

    fn image_filters(doc: &Document) -> Vec<String> {
        document::image_xobject_ids(doc)
            .into_iter()
            .map(|id| {
                let s = doc.get_object(id).unwrap().as_stream().unwrap();
                s.filters().map(|f| String::from_utf8_lossy(f[0]).into_owned()).unwrap_or_default()
            })
            .collect()
    }

    fn items(entries: Vec<FileEntry>, rotations: &[u16]) -> Vec<ImageItem> {
        entries
            .into_iter()
            .zip(rotations.iter())
            .map(|(entry, &rotation)| ImageItem { entry, rotation })
            .collect()
    }

    #[test]
    fn one_page_per_image_and_jpeg_kept_as_dct() {
        let dir = temp_dir();
        let rgb = DynamicImage::ImageRgb8(image::RgbImage::from_fn(64, 32, |x, _| image::Rgb([x as u8 * 4, 20, 200])));
        let rgba = DynamicImage::ImageRgba8(image::RgbaImage::from_pixel(10, 10, image::Rgba([0, 0, 0, 0])));
        let files = vec![
            write_image(&dir, "a.jpg", &rgb, ImageFormat::Jpeg),
            write_image(&dir, "b.png", &rgba, ImageFormat::Png),
        ];
        let out = dir.join("out.pdf");
        let info = convert(&items(files, &[0, 0]), &ImagesToPdfOptions::default(), &out).unwrap();
        assert_eq!(info.pages, 2);

        let doc = Document::load(&out).unwrap();
        assert_eq!(page_count(&doc), 2);
        let filters = image_filters(&doc);
        assert!(filters.contains(&"DCTDecode".to_string()));
        assert!(filters.contains(&"FlateDecode".to_string()));
        std::fs::remove_dir_all(dir).unwrap();
    }

    #[test]
    fn user_rotation_swaps_page_box_and_uses_rotation_matrix() {
        let dir = temp_dir();
        let rgb = DynamicImage::ImageRgb8(image::RgbImage::from_pixel(96, 48, image::Rgb([1, 2, 3])));
        let files = vec![write_image(&dir, "wide.jpg", &rgb, ImageFormat::Jpeg)];
        let out = dir.join("rot.pdf");
        convert(&items(files, &[90]), &ImagesToPdfOptions::default(), &out).unwrap();

        let doc = Document::load(&out).unwrap();
        // fit: 96px x 48px @96dpi = 72pt x 36pt, diputar 90 -> halaman 36 x 72
        let boxes = media_boxes(&doc);
        assert!((boxes[0].0 - 36.0).abs() < 0.01 && (boxes[0].1 - 72.0).abs() < 0.01, "{boxes:?}");
        let page_id = doc.page_iter().next().unwrap();
        let content = String::from_utf8_lossy(&doc.get_page_content(page_id)).into_owned();
        assert!(content.contains("0.0000 -72.0000 36.0000 0.0000 0.0000 72.0000 cm"), "{content}");
        assert_eq!(image_filters(&doc), vec!["DCTDecode".to_string()]);
        std::fs::remove_dir_all(dir).unwrap();
    }

    #[test]
    fn exif_rotated_jpeg_keeps_dct_and_lands_upright() {
        let dir = temp_dir();
        // 6 = Rotate90 (CW). Sampel mentah 80x40 (landscape) -> tampil 40x80 (portrait).
        let files = vec![write_exif_jpeg(&dir, "exif.jpg", 80, 40, 6)];
        let out = dir.join("exif.pdf");
        convert(&items(files, &[0]), &ImagesToPdfOptions::default(), &out).unwrap();

        let doc = Document::load(&out).unwrap();
        assert_eq!(image_filters(&doc), vec!["DCTDecode".to_string()]);
        let xobj = doc.get_object(document::image_xobject_ids(&doc)[0]).unwrap().as_stream().unwrap();
        assert_eq!(xobj.dict.get(b"Width").unwrap().as_i64().unwrap(), 80);
        assert_eq!(xobj.dict.get(b"Height").unwrap().as_i64().unwrap(), 40);
        // halaman portrait: 40px x 80px @96dpi = 30pt x 60pt
        let boxes = media_boxes(&doc);
        assert!((boxes[0].0 - 30.0).abs() < 0.01 && (boxes[0].1 - 60.0).abs() < 0.01, "{boxes:?}");

        // rotasi pengguna 270 + EXIF 90 = 360 -> kembali landscape tanpa matriks rotasi
        let files = vec![write_exif_jpeg(&dir, "exif2.jpg", 80, 40, 6)];
        let out2 = dir.join("exif2.pdf");
        convert(&items(files, &[270]), &ImagesToPdfOptions::default(), &out2).unwrap();
        let doc2 = Document::load(&out2).unwrap();
        let boxes2 = media_boxes(&doc2);
        assert!((boxes2[0].0 - 60.0).abs() < 0.01 && (boxes2[0].1 - 30.0).abs() < 0.01, "{boxes2:?}");
        std::fs::remove_dir_all(dir).unwrap();
    }

    #[test]
    fn resolve_items_validates_rotation_and_kind() {
        let id = Uuid::new_v4();
        let lookup = move |_| Ok(entry(PathBuf::from("x.png"), 1, 1));
        assert!(resolve_items(lookup, &[]).is_err());
        assert!(resolve_items(lookup, &[ImageSpec { file: id, rotation: 45 }]).is_err());
        let ok = resolve_items(lookup, &[ImageSpec { file: id, rotation: 450 }]).unwrap();
        assert_eq!(ok[0].rotation, 90);
        let _ = Object::Null;
    }
}
