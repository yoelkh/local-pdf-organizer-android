use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Copy, PartialEq, Eq, Deserialize, Default)]
#[serde(rename_all = "lowercase")]
pub enum OutputFormat {
    #[default]
    Png,
    Jpg,
}

impl OutputFormat {
    pub fn extension(self) -> &'static str {
        match self {
            OutputFormat::Png => "png",
            OutputFormat::Jpg => "jpg",
        }
    }
}

#[derive(Debug, Clone, Deserialize)]
pub struct PdfToImagesOptions {
    #[serde(default)]
    pub format: OutputFormat,
    /// Resolusi render; dibatasi 36..=600.
    #[serde(default = "default_dpi")]
    pub dpi: u32,
    /// Rentang halaman 1-based ("1-3,5"); kosong = semua.
    #[serde(default)]
    pub pages: Option<String>,
    /// Bungkus hasil ke satu file ZIP.
    #[serde(default)]
    pub zip: bool,
}

fn default_dpi() -> u32 {
    150
}

#[derive(Debug, Clone, Serialize)]
pub struct PdfToImagesResult {
    /// File gambar yang ditulis (kosong bila di-ZIP).
    pub files: Vec<String>,
    pub zip_path: Option<String>,
    pub out_dir: String,
    pub count: u32,
}
