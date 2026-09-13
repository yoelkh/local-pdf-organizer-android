//! Tahap gambar: kecilkan dan re-encode XObject gambar yang bisa ditangani.
//!
//! Hanya gambar 8-bit DeviceRGB / DeviceGray / CalRGB / CalGray / ICCBased(N=1|3)
//! dengan filter DCTDecode, FlateDecode, LZWDecode, atau tanpa filter yang diproses.
//! Gambar lain (CMYK, Indexed, 1-bit, JPX, CCITT, stencil mask) dibiarkan utuh.
//! Hasil hanya dipakai bila benar-benar lebih kecil dari stream asal.

use image::{DynamicImage, GenericImageView, GrayImage, RgbImage};
use lopdf::{Dictionary, Document, Object, ObjectId, Stream};

use crate::core::error::{AppError, AppResult};
use crate::core::pdf::document;
use crate::core::pdf::images;

use super::presets::Preset;

#[derive(Debug, Default, Clone, Copy)]
pub struct ImagePassStats {
    pub processed: u32,
    pub skipped: u32,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
enum ColorModel {
    Rgb,
    Gray,
}

impl ColorModel {
    fn channels(self) -> usize {
        match self {
            ColorModel::Rgb => 3,
            ColorModel::Gray => 1,
        }
    }
    fn device_name(self) -> &'static str {
        match self {
            ColorModel::Rgb => "DeviceRGB",
            ColorModel::Gray => "DeviceGray",
        }
    }
}

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
enum Encoding {
    Jpeg,
    /// Sampel mentah setelah filter lossless (Flate/LZW/none) dibuka.
    Raw,
}

struct Analysis {
    width: u32,
    height: u32,
    model: ColorModel,
    encoding: Encoding,
    smask: Option<ObjectId>,
}

pub fn recompress_images(doc: &mut Document, preset: &Preset) -> ImagePassStats {
    let mut stats = ImagePassStats::default();
    for id in document::image_xobject_ids(doc) {
        match recompress_one(doc, id, preset) {
            Ok(true) => stats.processed += 1,
            Ok(false) => stats.skipped += 1,
            Err(e) => {
                tracing::debug!("image {id:?} skipped: {e}");
                stats.skipped += 1;
            }
        }
    }
    stats
}

fn recompress_one(doc: &mut Document, id: ObjectId, preset: &Preset) -> AppResult<bool> {
    let stream = doc.get_object(id)?.as_stream()?.clone();
    let Some(a) = analyze(doc, &stream.dict) else {
        return Ok(false);
    };

    let source = decode_stream(&stream, &a)?;
    let original_len = stream.content.len();

    let scaled = images::downscale_to_fit(source, preset.max_side_px);
    let (new_w, new_h) = scaled.dimensions();
    let resized = (new_w, new_h) != (a.width, a.height);

    let encoded = match a.model {
        ColorModel::Rgb => images::encode_jpeg(&DynamicImage::ImageRgb8(scaled.to_rgb8()), preset.jpeg_quality)?,
        ColorModel::Gray => images::encode_jpeg(&DynamicImage::ImageLuma8(scaled.to_luma8()), preset.jpeg_quality)?,
    };
    if encoded.len() >= original_len {
        return Ok(false);
    }

    let mut dict = stream.dict.clone();
    dict.set("Width", new_w as i64);
    dict.set("Height", new_h as i64);
    dict.set("BitsPerComponent", 8);
    dict.set("ColorSpace", a.model.device_name());
    dict.set("Filter", "DCTDecode");
    dict.remove(b"DecodeParms");
    dict.remove(b"Length");
    let mut replacement = Stream::new(dict, encoded);
    replacement.allows_compression = false;
    doc.objects.insert(id, Object::Stream(replacement));

    if resized {
        if let Some(smask_id) = a.smask {
            if let Err(e) = rescale_smask(doc, smask_id, new_w, new_h) {
                tracing::debug!("smask {smask_id:?} left untouched: {e}");
            }
        }
    }
    Ok(true)
}

/// Periksa apakah gambar ini termasuk yang bisa kita proses.
fn analyze(doc: &Document, dict: &Dictionary) -> Option<Analysis> {
    if matches!(dict.get(b"ImageMask"), Ok(Object::Boolean(true))) {
        return None;
    }
    if dict.has(b"Mask") || dict.has(b"Decode") {
        return None;
    }
    let bpc = dict.get(b"BitsPerComponent").ok().and_then(|o| o.as_i64().ok())?;
    if bpc != 8 {
        return None;
    }
    let width = dict.get(b"Width").ok().and_then(|o| o.as_i64().ok())? as u32;
    let height = dict.get(b"Height").ok().and_then(|o| o.as_i64().ok())? as u32;
    if width == 0 || height == 0 {
        return None;
    }

    let model = color_model(doc, dict.get(b"ColorSpace").ok()?)?;

    let filters: Vec<Vec<u8>> = match dict.get(b"Filter") {
        Ok(Object::Name(n)) => vec![n.clone()],
        Ok(Object::Array(arr)) => arr.iter().filter_map(|o| o.as_name().ok().map(|n| n.to_vec())).collect(),
        Ok(Object::Reference(_)) => return None,
        _ => Vec::new(),
    };
    let encoding = if filters.is_empty() {
        Encoding::Raw
    } else if filters.len() == 1 && filters[0] == b"DCTDecode" {
        Encoding::Jpeg
    } else if filters.iter().all(|f| f == b"FlateDecode" || f == b"LZWDecode" || f == b"ASCII85Decode") {
        Encoding::Raw
    } else {
        return None;
    };

    let smask = match dict.get(b"SMask") {
        Ok(Object::Reference(id)) => Some(*id),
        _ => None,
    };

    Some(Analysis { width, height, model, encoding, smask })
}

fn color_model(doc: &Document, cs: &Object) -> Option<ColorModel> {
    match document::resolve(doc, cs) {
        Object::Name(n) => match n.as_slice() {
            b"DeviceRGB" | b"CalRGB" => Some(ColorModel::Rgb),
            b"DeviceGray" | b"CalGray" => Some(ColorModel::Gray),
            _ => None,
        },
        Object::Array(items) => {
            let family = items.first().map(|o| document::resolve(doc, o))?;
            match family {
                Object::Name(n) if n == b"ICCBased" => {
                    let profile = document::resolve(doc, items.get(1)?);
                    let n = profile.as_stream().ok()?.dict.get(b"N").ok()?.as_i64().ok()?;
                    match n {
                        3 => Some(ColorModel::Rgb),
                        1 => Some(ColorModel::Gray),
                        _ => None,
                    }
                }
                Object::Name(n) if n == b"CalRGB" => Some(ColorModel::Rgb),
                Object::Name(n) if n == b"CalGray" => Some(ColorModel::Gray),
                _ => None,
            }
        }
        _ => None,
    }
}

fn decode_stream(stream: &Stream, a: &Analysis) -> AppResult<DynamicImage> {
    match a.encoding {
        Encoding::Jpeg => Ok(images::decode(&stream.content)?.image),
        Encoding::Raw => {
            let raw = stream.get_plain_content()?;
            let expected = a.width as usize * a.height as usize * a.model.channels();
            if raw.len() < expected {
                return Err(AppError::Image("sample data shorter than expected".into()));
            }
            let samples = raw[..expected].to_vec();
            let img = match a.model {
                ColorModel::Rgb => DynamicImage::ImageRgb8(
                    RgbImage::from_raw(a.width, a.height, samples)
                        .ok_or_else(|| AppError::Image("bad rgb buffer".into()))?,
                ),
                ColorModel::Gray => DynamicImage::ImageLuma8(
                    GrayImage::from_raw(a.width, a.height, samples)
                        .ok_or_else(|| AppError::Image("bad gray buffer".into()))?,
                ),
            };
            Ok(img)
        }
    }
}

/// Samakan ukuran soft mask dengan gambar induk yang sudah dikecilkan.
fn rescale_smask(doc: &mut Document, id: ObjectId, width: u32, height: u32) -> AppResult<()> {
    let stream = doc.get_object(id)?.as_stream()?.clone();
    let mut a = analyze(doc, &stream.dict)
        .ok_or_else(|| AppError::Image("unsupported smask".into()))?;
    if a.model != ColorModel::Gray {
        return Err(AppError::Image("smask is not gray".into()));
    }
    a.smask = None;
    let mask = decode_stream(&stream, &a)?;
    let resized = mask.resize_exact(width, height, image::imageops::FilterType::Triangle);

    let mut dict = stream.dict.clone();
    dict.set("Width", width as i64);
    dict.set("Height", height as i64);
    dict.set("BitsPerComponent", 8);
    dict.set("ColorSpace", "DeviceGray");
    dict.remove(b"Filter");
    dict.remove(b"DecodeParms");
    dict.remove(b"Length");
    // Tanpa filter: `Document::compress()` akan men-Flate-nya nanti.
    let replacement = Stream::new(dict, resized.to_luma8().into_raw());
    doc.objects.insert(id, Object::Stream(replacement));
    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::core::pdf::document::{append_page, draw_image_content, new_blank_document, raw_xobject};
    use crate::features::compress::types::CompressLevel;

    fn photo_like(w: u32, h: u32) -> RgbImage {
        RgbImage::from_fn(w, h, |x, y| {
            let v = ((x * 7 + y * 13) % 251) as u8;
            image::Rgb([v, (v as u16 * 3 % 255) as u8, 255 - v])
        })
    }

    fn doc_with_big_raw_image() -> Document {
        let (mut doc, pages_id) = new_blank_document();
        let img = photo_like(2400, 1800);
        let id = doc.add_object(raw_xobject(2400, 1800, false, img.into_raw()));
        append_page(&mut doc, pages_id, 595.0, 842.0, &[("Im0", id)],
            draw_image_content("Im0", 0.0, 0.0, 595.0, 842.0)).unwrap();
        doc
    }

    #[test]
    fn large_rgb_image_is_downscaled_and_jpeg_encoded() {
        let mut doc = doc_with_big_raw_image();
        let before = doc.get_object(document::image_xobject_ids(&doc)[0]).unwrap()
            .as_stream().unwrap().content.len();
        let stats = recompress_images(&mut doc, &Preset::for_level(CompressLevel::Recommended));
        assert_eq!(stats.processed, 1);

        let id = document::image_xobject_ids(&doc)[0];
        let s = doc.get_object(id).unwrap().as_stream().unwrap();
        assert_eq!(s.dict.get(b"Width").unwrap().as_i64().unwrap(), 1650);
        assert_eq!(s.dict.get(b"Filter").unwrap().as_name().unwrap(), b"DCTDecode");
        // Pola uji sangat "berisik" sehingga JPEG tidak seefisien foto asli; cukup pastikan jauh lebih kecil.
        assert!(s.content.len() < before / 2, "{} vs {before}", s.content.len());
    }

    #[test]
    fn unsupported_colorspace_is_left_alone() {
        let (mut doc, _pages) = new_blank_document();
        let mut xobj = raw_xobject(4, 4, false, vec![0; 4 * 4 * 4]);
        xobj.dict.set("ColorSpace", "DeviceCMYK");
        doc.add_object(xobj);
        let stats = recompress_images(&mut doc, &Preset::for_level(CompressLevel::Extreme));
        assert_eq!(stats.processed, 0);
        assert_eq!(stats.skipped, 1);
    }
}
