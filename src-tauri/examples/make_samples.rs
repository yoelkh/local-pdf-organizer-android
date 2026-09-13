//! Membuat file contoh untuk uji manual di folder `samples/` (di akar repo).
//!
//! Jalankan: `cargo run --example make_samples` dari folder `src-tauri`.

use std::path::PathBuf;

use app_lib::core::pdf::document::{append_page, draw_image_content, new_blank_document, raw_xobject};
use image::{DynamicImage, ImageFormat, Rgb, RgbImage};
use lopdf::{dictionary, Object, Stream};

fn gradient(w: u32, h: u32, seed: u8) -> RgbImage {
    RgbImage::from_fn(w, h, |x, y| {
        let fx = x as f32 / w as f32;
        let fy = y as f32 / h as f32;
        Rgb([
            (fx * 255.0) as u8,
            (fy * 255.0) as u8,
            seed.wrapping_add(((fx + fy) * 90.0) as u8),
        ])
    })
}

/// Halaman "teks": beberapa balok warna dengan nomor halaman besar (path vektor sederhana).
fn vector_page(doc: &mut lopdf::Document, pages_id: lopdf::ObjectId, n: u32, shade: f32) {
    let content = format!(
        "q {shade} {} {} rg 40 700 515 100 re f Q\n\
         q 0.2 0.2 0.2 rg 40 60 515 20 re f Q\n\
         q 0.9 0.3 0.3 rg {} 300 200 250 re f Q\n",
        1.0 - shade,
        0.5,
        60 + n * 40
    );
    let content_id = doc.add_object(Stream::new(dictionary! {}, content.into_bytes()));
    let page_id = doc.add_object(dictionary! {
        "Type" => "Page",
        "Parent" => pages_id,
        "MediaBox" => vec![0.into(), 0.into(), 595.into(), 842.into()],
        "Contents" => content_id,
    });
    let pages = doc.get_object_mut(pages_id).unwrap().as_dict_mut().unwrap();
    if let Ok(Object::Array(kids)) = pages.get_mut(b"Kids") {
        kids.push(Object::Reference(page_id));
    }
    let count = pages.get(b"Count").and_then(Object::as_i64).unwrap_or(0);
    pages.set("Count", count + 1);
}

fn main() {
    let out = PathBuf::from(env!("CARGO_MANIFEST_DIR")).join("..").join("samples");
    std::fs::create_dir_all(&out).unwrap();

    // 1) PDF vektor 5 halaman
    let (mut doc, pages_id) = new_blank_document();
    for n in 0..5 {
        vector_page(&mut doc, pages_id, n, 0.15 * n as f32);
    }
    doc.compress();
    doc.save(out.join("laporan-5-halaman.pdf")).unwrap();

    // 2) PDF vektor 3 halaman (untuk merge)
    let (mut doc, pages_id) = new_blank_document();
    for n in 0..3 {
        vector_page(&mut doc, pages_id, n + 5, 0.6 + 0.1 * n as f32);
    }
    doc.compress();
    doc.save(out.join("lampiran-3-halaman.pdf")).unwrap();

    // 3) PDF berisi foto besar (untuk kompres)
    let (mut doc, pages_id) = new_blank_document();
    for n in 0..3u8 {
        let img = gradient(2400, 1800, n * 60);
        let id = doc.add_object(raw_xobject(2400, 1800, false, img.into_raw()));
        append_page(&mut doc, pages_id, 842.0, 595.0, &[("Im0", id)],
            draw_image_content("Im0", 0.0, 0.0, 842.0, 595.0)).unwrap();
    }
    doc.compress();
    doc.save(out.join("foto-scan.pdf")).unwrap();

    // 4) Gambar lepas
    DynamicImage::ImageRgb8(gradient(1600, 1200, 10))
        .save_with_format(out.join("gambar-1.jpg"), ImageFormat::Jpeg)
        .unwrap();
    DynamicImage::ImageRgb8(gradient(900, 1400, 120))
        .save_with_format(out.join("gambar-2.png"), ImageFormat::Png)
        .unwrap();

    println!("Contoh dibuat di {}", out.canonicalize().unwrap().display());
}
