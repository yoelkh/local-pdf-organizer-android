//! Helper `lopdf` untuk membaca, membangun, dan menulis struktur PDF.
//! Dipakai oleh fitur yang perlu memanipulasi objek PDF secara langsung
//! (gambar → PDF, kompres). Tidak ada logika khusus fitur di sini.

use std::path::Path;

use lopdf::{dictionary, Dictionary, Document, Object, ObjectId, Stream};

use crate::core::error::{AppError, AppResult};
use crate::core::fs;

/// Muat PDF dari disk. PDF terenkripsi ditolak karena tidak bisa dimodifikasi.
pub fn load(path: &Path) -> AppResult<Document> {
    fs::require_file(path)?;
    let doc = Document::load(path)?;
    if doc.is_encrypted() {
        return Err(AppError::Unsupported("encrypted PDF".into()));
    }
    Ok(doc)
}

/// Simpan dokumen secara atomik ke `path`.
pub fn save(doc: &mut Document, path: &Path) -> AppResult<()> {
    let mut buf: Vec<u8> = Vec::new();
    doc.save_to(&mut buf)?;
    fs::write_atomic(path, &buf)
}

pub fn page_count(doc: &Document) -> u32 {
    doc.page_iter().count() as u32
}

/// Ikuti referensi sampai ke objek aslinya.
pub fn resolve<'a>(doc: &'a Document, obj: &'a Object) -> &'a Object {
    let mut current = obj;
    for _ in 0..32 {
        match current {
            Object::Reference(id) => match doc.get_object(*id) {
                Ok(next) => current = next,
                Err(_) => return current,
            },
            _ => return current,
        }
    }
    current
}

/// Semua stream XObject bertipe `/Image`.
pub fn image_xobject_ids(doc: &Document) -> Vec<ObjectId> {
    doc.objects
        .iter()
        .filter_map(|(id, obj)| match obj {
            Object::Stream(stream) if is_image_stream(&stream.dict) => Some(*id),
            _ => None,
        })
        .collect()
}

pub fn is_image_stream(dict: &Dictionary) -> bool {
    matches!(dict.get(b"Subtype"), Ok(Object::Name(n)) if n == b"Image")
}

/// Hapus gambar pratinjau `/Thumb` dari setiap halaman. Mengembalikan jumlah yang dihapus.
pub fn strip_page_thumbnails(doc: &mut Document) -> usize {
    let page_ids: Vec<ObjectId> = doc.page_iter().collect();
    let mut removed = 0;
    for id in page_ids {
        if let Ok(page) = doc.get_dictionary_mut(id) {
            if page.remove(b"Thumb").is_some() {
                removed += 1;
            }
        }
    }
    removed
}

/// Hapus metadata XMP dari katalog.
pub fn strip_metadata(doc: &mut Document) -> bool {
    doc.catalog_mut()
        .map(|catalog| catalog.remove(b"Metadata").is_some())
        .unwrap_or(false)
}

/// Dokumen kosong siap diisi halaman. Mengembalikan (dokumen, id node `/Pages`).
pub fn new_blank_document() -> (Document, ObjectId) {
    let mut doc = Document::with_version("1.5");
    let pages_id = doc.new_object_id();
    let catalog_id = doc.add_object(dictionary! {
        "Type" => "Catalog",
        "Pages" => pages_id,
    });
    doc.objects.insert(
        pages_id,
        Object::Dictionary(dictionary! {
            "Type" => "Pages",
            "Kids" => Vec::<Object>::new(),
            "Count" => 0,
        }),
    );
    doc.trailer.set("Root", catalog_id);
    (doc, pages_id)
}

/// Tambahkan halaman berukuran `width_pt` × `height_pt` dengan content stream
/// dan XObject bernama (`name` → id) ke akhir dokumen.
pub fn append_page(
    doc: &mut Document,
    pages_id: ObjectId,
    width_pt: f32,
    height_pt: f32,
    xobjects: &[(&str, ObjectId)],
    content: Vec<u8>,
) -> AppResult<ObjectId> {
    let content_id = doc.add_object(Stream::new(dictionary! {}, content));

    let mut xobject_dict = Dictionary::new();
    for (name, id) in xobjects {
        xobject_dict.set(*name, Object::Reference(*id));
    }

    let page_id = doc.add_object(dictionary! {
        "Type" => "Page",
        "Parent" => pages_id,
        "MediaBox" => vec![0.into(), 0.into(), Object::Real(width_pt), Object::Real(height_pt)],
        "Resources" => dictionary! { "XObject" => xobject_dict },
        "Contents" => content_id,
    });

    let pages = doc
        .get_object_mut(pages_id)?
        .as_dict_mut()?;
    match pages.get_mut(b"Kids") {
        Ok(Object::Array(kids)) => kids.push(Object::Reference(page_id)),
        _ => pages.set("Kids", vec![Object::Reference(page_id)]),
    }
    let count = pages.get(b"Count").and_then(Object::as_i64).unwrap_or(0);
    pages.set("Count", count + 1);

    Ok(page_id)
}

/// Bentuk stream XObject gambar JPEG (DCTDecode) yang siap ditambahkan ke dokumen.
pub fn jpeg_xobject(width: u32, height: u32, gray: bool, jpeg: Vec<u8>) -> Stream {
    let mut stream = Stream::new(
        dictionary! {
            "Type" => "XObject",
            "Subtype" => "Image",
            "Width" => width as i64,
            "Height" => height as i64,
            "ColorSpace" => if gray { "DeviceGray" } else { "DeviceRGB" },
            "BitsPerComponent" => 8,
            "Filter" => "DCTDecode",
        },
        jpeg,
    );
    stream.allows_compression = false;
    stream
}

/// Bentuk stream XObject gambar mentah (akan di-Flate saat `doc.compress()`).
pub fn raw_xobject(width: u32, height: u32, gray: bool, samples: Vec<u8>) -> Stream {
    Stream::new(
        dictionary! {
            "Type" => "XObject",
            "Subtype" => "Image",
            "Width" => width as i64,
            "Height" => height as i64,
            "ColorSpace" => if gray { "DeviceGray" } else { "DeviceRGB" },
            "BitsPerComponent" => 8,
        },
        samples,
    )
}

/// Content stream yang menggambar XObject `name` memenuhi kotak (x, y, w, h) dalam poin.
pub fn draw_image_content(name: &str, x: f32, y: f32, w: f32, h: f32) -> Vec<u8> {
    draw_image_content_rotated(name, x, y, w, h, 0)
}

/// Seperti `draw_image_content`, tetapi gambar diputar `rotation` derajat searah
/// jarum jam di dalam kotak (x, y, w, h). Kotak adalah extent gambar *setelah*
/// rotasi, jadi untuk 90/270 pemanggil menukar lebar/tinggi gambar.
/// Rotasi dilakukan lewat matriks `cm`, sehingga sampel XObject tidak perlu di-encode ulang.
pub fn draw_image_content_rotated(name: &str, x: f32, y: f32, w: f32, h: f32, rotation: u16) -> Vec<u8> {
    let m = match rotation % 360 {
        90 => format!("0.0000 {:.4} {w:.4} 0.0000 {x:.4} {:.4}", -h, y + h),
        180 => format!("{:.4} 0.0000 0.0000 {:.4} {:.4} {:.4}", -w, -h, x + w, y + h),
        270 => format!("0.0000 {h:.4} {:.4} 0.0000 {:.4} {y:.4}", -w, x + w),
        _ => format!("{w:.4} 0.0000 0.0000 {h:.4} {x:.4} {y:.4}"),
    };
    format!("q\n{m} cm\n/{name} Do\nQ\n").into_bytes()
}

#[cfg(test)]
mod tests {
    use super::*;

    /// Terapkan matriks `a b c d e f` pada titik satuan (u, v).
    fn apply(m: &[f32; 6], u: f32, v: f32) -> (f32, f32) {
        (m[0] * u + m[2] * v + m[4], m[1] * u + m[3] * v + m[5])
    }

    fn matrix_of(content: &[u8]) -> [f32; 6] {
        let text = String::from_utf8_lossy(content);
        let line = text.lines().find(|l| l.ends_with(" cm")).unwrap();
        let nums: Vec<f32> = line.split_whitespace().take(6).map(|n| n.parse().unwrap()).collect();
        nums.try_into().unwrap()
    }

    #[test]
    fn rotation_matrices_map_image_corners_into_the_box() {
        // Kotak 10..40 x 20..80 (w=30, h=60). Untuk setiap sudut, keempat sudut gambar
        // harus jatuh tepat di sudut kotak, dan "atas" gambar (v=1) pindah sesuai arah putar.
        for rot in [0u16, 90, 180, 270] {
            let m = matrix_of(&draw_image_content_rotated("Im0", 10.0, 20.0, 30.0, 60.0, rot));
            let corners = [(0.0, 0.0), (1.0, 0.0), (1.0, 1.0), (0.0, 1.0)];
            for (u, v) in corners {
                let (px, py) = apply(&m, u, v);
                assert!((px - 10.0).abs() < 1e-3 || (px - 40.0).abs() < 1e-3, "rot {rot}: x={px}");
                assert!((py - 20.0).abs() < 1e-3 || (py - 80.0).abs() < 1e-3, "rot {rot}: y={py}");
            }
            let (tx, ty) = apply(&m, 0.5, 1.0); // tengah sisi atas gambar
            match rot {
                0 => assert!((ty - 80.0).abs() < 1e-3),   // atas tetap di atas
                90 => assert!((tx - 40.0).abs() < 1e-3),  // searah jarum jam: atas ke kanan
                180 => assert!((ty - 20.0).abs() < 1e-3), // atas ke bawah
                _ => assert!((tx - 10.0).abs() < 1e-3),   // 270: atas ke kiri
            }
        }
    }

    #[test]
    fn blank_document_gets_pages_appended() {
        let (mut doc, pages_id) = new_blank_document();
        let img = doc.add_object(raw_xobject(1, 1, false, vec![255, 0, 0]));
        append_page(&mut doc, pages_id, 100.0, 200.0, &[("Im0", img)],
            draw_image_content("Im0", 0.0, 0.0, 100.0, 200.0)).unwrap();
        append_page(&mut doc, pages_id, 100.0, 200.0, &[], Vec::new()).unwrap();
        assert_eq!(page_count(&doc), 2);

        let mut buf = Vec::new();
        doc.save_to(&mut buf).unwrap();
        let reloaded = Document::load_mem(&buf).unwrap();
        assert_eq!(page_count(&reloaded), 2);
        assert_eq!(image_xobject_ids(&reloaded).len(), 1);
    }
}
