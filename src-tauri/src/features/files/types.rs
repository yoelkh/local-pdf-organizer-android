use serde::Serialize;

use crate::core::files::FileInfo;

#[derive(Debug, Clone, Serialize)]
pub struct SkippedFile {
    pub path: String,
    pub reason: String,
}

/// Hasil `inspect_files`: file yang berhasil didaftarkan dan yang dilewati.
#[derive(Debug, Clone, Serialize)]
pub struct InspectResult {
    pub files: Vec<FileInfo>,
    pub skipped: Vec<SkippedFile>,
}
