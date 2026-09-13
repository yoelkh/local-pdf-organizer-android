//! Primitif PDF yang dipakai lintas fitur.
//!
//! - `engine`   : thread PDFium + antrean job (render, salin halaman, inspeksi)
//! - `render`   : render halaman menjadi gambar
//! - `assemble` : susun PDF baru dari daftar halaman sumber (+ rotasi)
//! - `document` : helper `lopdf` untuk manipulasi struktur PDF
//! - `images`   : decode/encode/skala gambar (crate `image`)
//! - `page_range`: parser rentang halaman "1-3,5"

pub mod assemble;
pub mod document;
pub mod engine;
pub mod images;
pub mod page_range;
pub mod render;
