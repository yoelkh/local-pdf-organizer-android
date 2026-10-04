use std::path::{Path, PathBuf};
use crate::core::error::{AppError, AppResult};
use crate::core::cache::CacheDir;
use uuid::Uuid;

/// Menghasilkan path baru untuk file output di dalam direktori ekspor.
pub fn new_output_path(cache: &CacheDir, file_name: &str) -> AppResult<PathBuf> {
    let sanitized = crate::core::fs::sanitize_file_name(file_name);
    let id = Uuid::new_v4().simple().to_string();
    let dir = cache.exports_dir().join(id);
    std::fs::create_dir_all(&dir)?;
    Ok(dir.join(sanitized))
}

/// Menghasilkan direktori baru untuk output di dalam direktori ekspor.
pub fn new_output_dir(cache: &CacheDir) -> AppResult<PathBuf> {
    let id = Uuid::new_v4().simple().to_string();
    let dir = cache.exports_dir().join(id);
    std::fs::create_dir_all(&dir)?;
    Ok(dir)
}

/// Memvalidasi bahwa path berada di dalam direktori ekspor.
pub fn check_inside_exports(cache: &CacheDir, path: &Path) -> AppResult<()> {
    let exports = std::fs::canonicalize(cache.exports_dir())
        .map_err(|_| AppError::InvalidInput("Could not canonicalize exports dir".into()))?;
    let target = std::fs::canonicalize(path)
        .map_err(|_| AppError::InvalidInput(format!("Could not canonicalize path: {}", path.display())))?;
    
    if target.starts_with(&exports) {
        Ok(())
    } else {
        Err(AppError::InvalidInput(format!("Path outside exports: {}", path.display())))
    }
}

/// Menyimpan file output ke lokasi tujuan lokal.
pub fn save_output_local(cache: &CacheDir, src: &Path, destination: &Path) -> AppResult<()> {
    check_inside_exports(cache, src)?;
    
    let parent = destination.parent().unwrap_or_else(|| Path::new(""));
    if !parent.as_os_str().is_empty() {
        std::fs::create_dir_all(parent)?;
    }
    
    let temp = parent.join(format!(".{}.tmp", Uuid::new_v4().simple()));
    std::fs::copy(src, &temp)?;
    
    std::fs::rename(&temp, destination).map_err(|e| {
        let _ = std::fs::remove_file(&temp);
        AppError::from(e)
    })
}

/// Menentukan MIME type untuk daftar file. Jika semua file memiliki MIME type yang sama,
/// akan dikembalikan tipe tersebut, jika tidak akan dikembalikan `*/*`.
pub fn determine_mime_type(paths: &[String]) -> String {
    if paths.is_empty() {
        return "*/*".to_string();
    }
    let ext = Path::new(&paths[0]).extension().map(|e| e.to_string_lossy().to_lowercase()).unwrap_or_default();
    let first_mime = match ext.as_str() {
        "pdf" => "application/pdf",
        "png" => "image/png",
        "jpg" | "jpeg" => "image/jpeg",
        "zip" => "application/zip",
        _ => "application/octet-stream",
    };
    for path in paths.iter().skip(1) {
        let e = Path::new(path).extension().map(|e| e.to_string_lossy().to_lowercase()).unwrap_or_default();
        let mime = match e.as_str() {
            "pdf" => "application/pdf",
            "png" => "image/png",
            "jpg" | "jpeg" => "image/jpeg",
            "zip" => "application/zip",
            _ => "application/octet-stream",
        };
        if mime != first_mime {
            return "*/*".to_string();
        }
    }
    first_mime.to_string()
}
