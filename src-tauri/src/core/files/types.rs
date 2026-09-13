use std::path::{Path, PathBuf};

use serde::{Deserialize, Serialize};
use uuid::Uuid;

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "lowercase")]
pub enum FileKind {
    Pdf,
    Image,
}

/// Entri internal: menyimpan path asli sebagai `PathBuf`.
#[derive(Debug, Clone)]
pub struct FileEntry {
    pub id: Uuid,
    pub path: PathBuf,
    pub name: String,
    pub kind: FileKind,
    pub size: u64,
    /// Jumlah halaman (PDF) atau 1 (gambar).
    pub pages: u32,
    /// Lebar/tinggi halaman pertama dalam poin (PDF) atau piksel (gambar).
    pub width: f32,
    pub height: f32,
}

/// Bentuk yang dikirim ke frontend.
#[derive(Debug, Clone, Serialize)]
pub struct FileInfo {
    pub id: Uuid,
    pub path: String,
    pub name: String,
    pub kind: FileKind,
    pub size: u64,
    pub pages: u32,
    pub width: f32,
    pub height: f32,
}

impl From<&FileEntry> for FileInfo {
    fn from(e: &FileEntry) -> Self {
        FileInfo {
            id: e.id,
            path: e.path.to_string_lossy().into_owned(),
            name: e.name.clone(),
            kind: e.kind,
            size: e.size,
            pages: e.pages,
            width: e.width,
            height: e.height,
        }
    }
}

/// Ringkasan file hasil yang ditulis ke disk.
#[derive(Debug, Clone, Serialize)]
pub struct OutputInfo {
    pub path: String,
    pub name: String,
    pub size: u64,
    pub pages: u32,
}

impl OutputInfo {
    pub fn from_path(path: &Path, pages: u32) -> std::io::Result<Self> {
        let size = std::fs::metadata(path)?.len();
        Ok(OutputInfo {
            path: path.to_string_lossy().into_owned(),
            name: path
                .file_name()
                .map(|n| n.to_string_lossy().into_owned())
                .unwrap_or_default(),
            size,
            pages,
        })
    }
}
