//! Kompres PDF: kecilkan & re-encode gambar, buang objek tak terpakai,
//! Flate semua stream. Tiga level preset (low / recommended / extreme).

pub mod commands;
pub mod image_pass;
pub mod presets;
pub mod service;
pub mod types;
