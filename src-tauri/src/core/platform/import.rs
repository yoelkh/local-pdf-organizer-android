use std::path::PathBuf;
use crate::core::error::AppResult;

/// Mengimpor file lokal.
pub fn import_file_local(uri: &str) -> AppResult<(PathBuf, String)> {
    let path = PathBuf::from(uri);
    let name = path.file_name().map(|n| n.to_string_lossy().into_owned()).unwrap_or_default();
    Ok((path, name))
}
