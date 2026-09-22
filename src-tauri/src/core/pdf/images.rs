//! Decode, encode, dan penskalaan gambar (crate `image`).

use std::io::Cursor;
use std::path::Path;

use image::codecs::jpeg::JpegEncoder;
use image::imageops::FilterType;
use image::metadata::Orientation;
use image::{
    ColorType, DynamicImage, GenericImageView, GrayImage, ImageDecoder, ImageFormat, ImageReader,
    RgbImage,
};

use crate::core::error::AppResult;

/// Dimensi (lebar, tinggi) tanpa mendecode seluruh gambar, **tanpa** koreksi EXIF.
pub fn dimensions(path: &Path) -> AppResult<(u32, u32)> {
    Ok(image::image_dimensions(path)?)
}

/// Dimensi tampil (lebar, tinggi) setelah orientasi EXIF diterapkan,
/// hanya membaca header (tidak mendecode piksel).
pub fn dimensions_oriented(path: &Path) -> AppResult<(u32, u32)> {
    let mut decoder = ImageReader::open(path)?.with_guessed_format()?.into_decoder()?;
    let (w, h) = decoder.dimensions();
    let orientation = decoder.orientation().unwrap_or(Orientation::NoTransforms);
    Ok(if swaps_axes(orientation) { (h, w) } else { (w, h) })
}

/// `true` bila orientasi EXIF menukar lebar dan tinggi.
pub fn swaps_axes(orientation: Orientation) -> bool {
    matches!(
        orientation,
        Orientation::Rotate90 | Orientation::Rotate270 | Orientation::Rotate90FlipH | Orientation::Rotate270FlipH
    )
}

/// Derajat rotasi searah jarum jam bila orientasi EXIF hanya berupa rotasi murni
/// (tanpa cermin). `None` untuk varian flip/mirror.
pub fn orientation_degrees(orientation: Orientation) -> Option<u16> {
    match orientation {
        Orientation::NoTransforms => Some(0),
        Orientation::Rotate90 => Some(90),
        Orientation::Rotate180 => Some(180),
        Orientation::Rotate270 => Some(270),
        _ => None,
    }
}

pub fn is_jpeg(bytes: &[u8]) -> bool {
    bytes.len() > 3 && bytes[0] == 0xFF && bytes[1] == 0xD8 && bytes[2] == 0xFF
}

/// Jumlah komponen warna JPEG dari marker SOF (1 = gray, 3 = YCbCr/RGB, 4 = CMYK).
/// `None` bila bukan JPEG atau marker tidak ditemukan.
pub fn jpeg_components(bytes: &[u8]) -> Option<u8> {
    if !is_jpeg(bytes) {
        return None;
    }
    let mut i = 2;
    while i + 4 <= bytes.len() {
        if bytes[i] != 0xFF {
            i += 1;
            continue;
        }
        let marker = bytes[i + 1];
        if marker == 0xFF {
            i += 1;
            continue;
        }
        // Marker tanpa panjang (RSTn, SOI, EOI, TEM)
        if (0xD0..=0xD9).contains(&marker) || marker == 0x01 {
            i += 2;
            continue;
        }
        let len = u16::from_be_bytes([bytes[i + 2], bytes[i + 3]]) as usize;
        let is_sof = matches!(marker, 0xC0..=0xCF) && !matches!(marker, 0xC4 | 0xC8 | 0xCC);
        if is_sof {
            // payload: precision(1) height(2) width(2) components(1)
            return bytes.get(i + 9).copied();
        }
        if marker == 0xDA {
            return None; // sudah masuk scan data tanpa SOF
        }
        i += 2 + len;
    }
    None
}

/// Hasil decode beserta informasi format asal.
pub struct Decoded {
    pub image: DynamicImage,
    pub format: Option<ImageFormat>,
    /// Orientasi EXIF asal. `image` sudah dikoreksi sesuai orientasi ini.
    pub orientation: Orientation,
}

/// Decode dari bytes dan terapkan orientasi EXIF bila ada.
pub fn decode(bytes: &[u8]) -> AppResult<Decoded> {
    let reader = ImageReader::new(Cursor::new(bytes)).with_guessed_format()?;
    let format = reader.format();
    let mut decoder = reader.into_decoder()?;
    let orientation = decoder.orientation().unwrap_or(Orientation::NoTransforms);
    let mut image = DynamicImage::from_decoder(decoder)?;
    if orientation != Orientation::NoTransforms {
        image.apply_orientation(orientation);
    }
    Ok(Decoded { image, format, orientation })
}

/// Decode langsung dari file.
pub fn decode_file(path: &Path) -> AppResult<Decoded> {
    let bytes = std::fs::read(path)?;
    decode(&bytes)
}

pub fn has_alpha(image: &DynamicImage) -> bool {
    image.color().has_alpha()
}

pub fn is_grayscale(image: &DynamicImage) -> bool {
    matches!(
        image.color(),
        ColorType::L8 | ColorType::L16 | ColorType::La8 | ColorType::La16
    )
}

/// Ratakan alpha di atas putih dan kembalikan RGB 8-bit.
pub fn flatten_to_rgb(image: &DynamicImage) -> RgbImage {
    if !has_alpha(image) {
        return image.to_rgb8();
    }
    let rgba = image.to_rgba8();
    let (w, h) = rgba.dimensions();
    let mut out = RgbImage::new(w, h);
    for (x, y, px) in rgba.enumerate_pixels() {
        let a = px[3] as u32;
        let blend = |c: u8| ((c as u32 * a + 255 * (255 - a)) / 255) as u8;
        out.put_pixel(x, y, image::Rgb([blend(px[0]), blend(px[1]), blend(px[2])]));
    }
    out
}

/// Ratakan alpha di atas putih dan kembalikan grayscale 8-bit.
pub fn flatten_to_gray(image: &DynamicImage) -> GrayImage {
    if !has_alpha(image) {
        return image.to_luma8();
    }
    DynamicImage::ImageRgb8(flatten_to_rgb(image)).to_luma8()
}

/// Kecilkan bila sisi terpanjang melebihi `max_side`; selain itu kembalikan apa adanya.
pub fn downscale_to_fit(image: DynamicImage, max_side: u32) -> DynamicImage {
    let (w, h) = image.dimensions();
    let longest = w.max(h);
    if longest <= max_side || max_side == 0 {
        return image;
    }
    let scale = max_side as f32 / longest as f32;
    let nw = ((w as f32 * scale).round() as u32).max(1);
    let nh = ((h as f32 * scale).round() as u32).max(1);
    image.resize_exact(nw, nh, FilterType::Lanczos3)
}

/// Thumbnail dengan lebar tetap (filter cepat).
pub fn thumbnail_width(image: &DynamicImage, width: u32) -> DynamicImage {
    let (w, h) = image.dimensions();
    if w == 0 || h == 0 {
        return image.clone();
    }
    let height = ((h as f32 / w as f32) * width as f32).round().max(1.0) as u32;
    image.resize_exact(width, height, FilterType::Triangle)
}

pub fn encode_jpeg(image: &DynamicImage, quality: u8) -> AppResult<Vec<u8>> {
    let mut buf = Vec::new();
    let mut encoder = JpegEncoder::new_with_quality(&mut buf, quality.clamp(1, 100));
    match image {
        DynamicImage::ImageLuma8(g) => encoder.encode_image(g)?,
        DynamicImage::ImageRgb8(rgb) => encoder.encode_image(rgb)?,
        other => encoder.encode_image(&flatten_to_rgb(other))?,
    }
    Ok(buf)
}

pub fn encode_png(image: &DynamicImage) -> AppResult<Vec<u8>> {
    let mut buf = Cursor::new(Vec::new());
    image.write_to(&mut buf, ImageFormat::Png)?;
    Ok(buf.into_inner())
}

#[cfg(test)]
mod tests {
    use super::*;

    fn checker(w: u32, h: u32) -> DynamicImage {
        let mut img = image::RgbaImage::new(w, h);
        for (x, y, p) in img.enumerate_pixels_mut() {
            let on = (x / 4 + y / 4) % 2 == 0;
            *p = if on { image::Rgba([200, 30, 30, 255]) } else { image::Rgba([0, 0, 0, 0]) };
        }
        DynamicImage::ImageRgba8(img)
    }

    #[test]
    fn flatten_composites_transparent_pixels_on_white() {
        let rgb = flatten_to_rgb(&checker(8, 8));
        assert_eq!(rgb.get_pixel(0, 0).0, [200, 30, 30]);
        assert_eq!(rgb.get_pixel(4, 0).0, [255, 255, 255]);
    }

    #[test]
    fn downscale_respects_max_side() {
        let small = downscale_to_fit(checker(400, 200), 100);
        assert_eq!(small.dimensions(), (100, 50));
        let same = downscale_to_fit(checker(40, 20), 100);
        assert_eq!(same.dimensions(), (40, 20));
    }

    #[test]
    fn jpeg_component_count_is_read_from_sof() {
        let rgb = encode_jpeg(&checker(8, 8), 80).unwrap();
        assert_eq!(jpeg_components(&rgb), Some(3));
        let gray = encode_jpeg(&DynamicImage::ImageLuma8(checker(8, 8).to_luma8()), 80).unwrap();
        assert_eq!(jpeg_components(&gray), Some(1));
        assert_eq!(jpeg_components(b"not a jpeg"), None);
    }

    #[test]
    fn orientation_helpers_classify_exif_values() {
        assert_eq!(orientation_degrees(Orientation::Rotate90), Some(90));
        assert_eq!(orientation_degrees(Orientation::FlipHorizontal), None);
        assert!(swaps_axes(Orientation::Rotate270));
        assert!(!swaps_axes(Orientation::Rotate180));
    }

    #[test]
    fn jpeg_roundtrip_decodes() {
        let jpeg = encode_jpeg(&checker(32, 16), 80).unwrap();
        assert!(is_jpeg(&jpeg));
        let decoded = decode(&jpeg).unwrap();
        assert_eq!(decoded.image.dimensions(), (32, 16));
        assert_eq!(decoded.format, Some(ImageFormat::Jpeg));
    }
}
