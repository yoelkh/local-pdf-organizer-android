use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Copy, PartialEq, Eq, Deserialize, Default)]
#[serde(rename_all = "lowercase")]
pub enum CompressLevel {
    /// Kualitas tinggi, penghematan kecil.
    Low,
    /// Keseimbangan kualitas dan ukuran.
    #[default]
    Recommended,
    /// Ukuran sekecil mungkin, kualitas gambar turun terlihat.
    Extreme,
}

#[derive(Debug, Clone, Serialize)]
pub struct CompressResult {
    pub path: String,
    pub name: String,
    pub original_size: u64,
    pub compressed_size: u64,
    /// `true` bila hasil kompresi tidak lebih kecil dan file asli disalin apa adanya.
    pub unchanged: bool,
    pub images_processed: u32,
    pub images_skipped: u32,
}
