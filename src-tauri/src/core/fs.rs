//! Utilitas sistem berkas yang aman dipakai lintas fitur.

use std::path::{Path, PathBuf};

use crate::core::error::{AppError, AppResult};

/// Tulis file secara atomik: tulis ke file sementara di folder yang sama,
/// lalu rename. Hasil akhir tidak pernah berupa file setengah jadi.
pub fn write_atomic(path: &Path, bytes: &[u8]) -> AppResult<()> {
    ensure_parent(path)?;
    let tmp = temp_sibling(path);
    std::fs::write(&tmp, bytes)?;
    if path.exists() {
        std::fs::remove_file(path)?;
    }
    std::fs::rename(&tmp, path)?;
    Ok(())
}

pub fn ensure_parent(path: &Path) -> AppResult<()> {
    if let Some(parent) = path.parent() {
        if !parent.as_os_str().is_empty() {
            std::fs::create_dir_all(parent)?;
        }
    }
    Ok(())
}

pub fn ensure_dir(path: &Path) -> AppResult<()> {
    std::fs::create_dir_all(path)?;
    Ok(())
}

pub fn file_size(path: &Path) -> AppResult<u64> {
    Ok(std::fs::metadata(path)?.len())
}

pub fn require_file(path: &Path) -> AppResult<()> {
    if path.is_file() {
        Ok(())
    } else {
        Err(AppError::FileNotFound(path.display().to_string()))
    }
}

/// Nama file (tanpa folder) tanpa ekstensi.
pub fn file_stem(path: &Path) -> String {
    path.file_stem()
        .map(|s| s.to_string_lossy().into_owned())
        .unwrap_or_else(|| "output".to_string())
}

/// Ekstensi dalam huruf kecil, tanpa titik.
pub fn extension_lower(path: &Path) -> String {
    path.extension()
        .map(|e| e.to_string_lossy().to_lowercase())
        .unwrap_or_default()
}

/// Ganti karakter yang tidak boleh ada di nama file Windows.
pub fn sanitize_file_name(name: &str) -> String {
    let cleaned: String = name
        .chars()
        .map(|c| match c {
            '<' | '>' | ':' | '"' | '/' | '\\' | '|' | '?' | '*' => '_',
            c if (c as u32) < 32 => '_',
            c => c,
        })
        .collect();
    let trimmed = cleaned.trim().trim_end_matches('.');
    if trimmed.is_empty() {
        "output".to_string()
    } else {
        trimmed.to_string()
    }
}

/// Path unik di `dir` dengan pola `stem.ext`, `stem (1).ext`, `stem (2).ext`, ...
pub fn unique_path(dir: &Path, stem: &str, ext: &str) -> PathBuf {
    let stem = sanitize_file_name(stem);
    let first = dir.join(format!("{stem}.{ext}"));
    if !first.exists() {
        return first;
    }
    for n in 1..10_000 {
        let candidate = dir.join(format!("{stem} ({n}).{ext}"));
        if !candidate.exists() {
            return candidate;
        }
    }
    dir.join(format!("{stem}-{}.{ext}", uuid::Uuid::new_v4()))
}

fn temp_sibling(path: &Path) -> PathBuf {
    let name = path
        .file_name()
        .map(|n| n.to_string_lossy().into_owned())
        .unwrap_or_else(|| "output".into());
    path.with_file_name(format!(".{name}.{}.partial", uuid::Uuid::new_v4().simple()))
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn sanitize_replaces_forbidden_characters() {
        assert_eq!(sanitize_file_name("a:b/c?d"), "a_b_c_d");
        assert_eq!(sanitize_file_name("   "), "output");
        assert_eq!(sanitize_file_name("name."), "name");
    }

    #[test]
    fn write_atomic_creates_parent_and_file() {
        let dir = std::env::temp_dir().join(format!("lpo-test-{}", uuid::Uuid::new_v4()));
        let target = dir.join("nested").join("out.bin");
        write_atomic(&target, b"hello").unwrap();
        assert_eq!(std::fs::read(&target).unwrap(), b"hello");
        write_atomic(&target, b"world").unwrap();
        assert_eq!(std::fs::read(&target).unwrap(), b"world");
        std::fs::remove_dir_all(dir).unwrap();
    }
}
