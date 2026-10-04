//! Lapisan inti: primitif yang dipakai semua fitur.
//! Aturan: `core` tidak boleh mengetahui fitur apa pun (`features::*`).

pub mod cache;
pub mod error;
pub mod files;
pub mod fs;
pub mod pdf;
pub mod progress;
pub mod state;
pub mod platform;
