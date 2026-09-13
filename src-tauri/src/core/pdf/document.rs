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
    format!("q\n{w:.4} 0 0 {h:.4} {x:.4} {y:.4} cm\n/{name} Do\nQ\n").into_bytes()
}

#[cfg(test)]
mod tests {
    use super::*;

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
