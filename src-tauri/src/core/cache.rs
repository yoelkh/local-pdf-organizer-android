//! Cache thumbnail di folder cache aplikasi. Dibersihkan setiap startup.

use std::path::{Path, PathBuf};

use uuid::Uuid;

use crate::core::error::AppResult;

#[derive(Debug, Clone)]
pub struct CacheDir {
    root: PathBuf,
}

impl CacheDir {
    /// Siapkan folder cache dan buang isi lama.
    pub fn prepare(root: PathBuf) -> AppResult<Self> {
        let thumbs = root.join("thumbs");
        if thumbs.exists() {
            let _ = std::fs::remove_dir_all(&thumbs);
        }
        std::fs::create_dir_all(&thumbs)?;
        Ok(Self { root })
    }

    pub fn root(&self) -> &Path {
        &self.root
    }

    /// Lokasi PNG thumbnail untuk (file, halaman, lebar).
    pub fn thumb_path(&self, file_id: Uuid, page: u32, width: u32) -> PathBuf {
        self.root
            .join("thumbs")
            .join(file_id.simple().to_string())
            .join(format!("p{page}_w{width}.png"))
    }

    /// Hapus semua thumbnail milik satu file.
    pub fn forget_file(&self, file_id: Uuid) {
        let dir = self.root.join("thumbs").join(file_id.simple().to_string());
        let _ = std::fs::remove_dir_all(dir);
    }
}
