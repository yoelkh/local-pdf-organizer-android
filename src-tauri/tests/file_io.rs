//
use app_lib::core::cache::CacheDir;
use app_lib::core::platform::check_inside_exports;
use app_lib::core::files::inspect::detect_kind;
use app_lib::core::files::types::FileKind;
use uuid::Uuid;
use std::fs;

#[test]
fn test_kind_sniffing() {
    let dir = std::env::temp_dir().join(format!("lpo-test-{}", Uuid::new_v4()));
    fs::create_dir_all(&dir).unwrap();
    
    let pdf_path = dir.join("no_extension_pdf");
    fs::write(&pdf_path, b"%PDF-1.4\nSome PDF content").unwrap();
    
    let png_path = dir.join("no_extension_png");
    fs::write(&png_path, b"\x89PNG\r\n\x1a\n\x00\x00\x00\x0dIHDR").unwrap();
    
    let garbage_path = dir.join("garbage");
    fs::write(&garbage_path, b"Just some random text data").unwrap();
    
    assert_eq!(detect_kind(&pdf_path), Some(FileKind::Pdf));
    assert_eq!(detect_kind(&png_path), Some(FileKind::Image));
    assert_eq!(detect_kind(&garbage_path), None);
    
    fs::remove_dir_all(dir).unwrap();
}

#[test]
fn test_inside_exports_validator() {
    let dir = std::env::temp_dir().join(format!("lpo-test-{}", Uuid::new_v4()));
    let cache = CacheDir::prepare(dir.clone()).unwrap();
    
    let exports = cache.exports_dir();
    let valid_path = exports.join("my_file.pdf");
    fs::write(&valid_path, b"test").unwrap();
    
    let outside_path = cache.imports_dir().join("other.pdf");
    fs::write(&outside_path, b"test").unwrap();
    
    // Test valid path
    assert!(check_inside_exports(&cache, &valid_path).is_ok());
    
    // Test outside path
    assert!(check_inside_exports(&cache, &outside_path).is_err());
    
    // Test traversal
    let traversal = exports.join("..").join("imports").join("other.pdf");
    assert!(check_inside_exports(&cache, &traversal).is_err());
    
    fs::remove_dir_all(dir).unwrap();
}

#[test]
fn test_save_output_overwrite() {
    let dir = std::env::temp_dir().join(format!("lpo-test-{}", Uuid::new_v4()));
    let cache = CacheDir::prepare(dir.clone()).unwrap();
    
    let src = cache.exports_dir().join("src.pdf");
    fs::write(&src, b"source").unwrap();
    
    let dest = dir.join("dest.pdf");
    fs::write(&dest, b"old").unwrap();
    
    app_lib::core::platform::save_output_local(&cache, &src, &dest).unwrap();
    
    assert_eq!(fs::read(&dest).unwrap(), b"source");
    
    fs::remove_dir_all(dir).unwrap();
}

#[test]
fn test_new_output_path() {
    let dir = std::env::temp_dir().join(format!("lpo-test-{}", Uuid::new_v4()));
    let cache = CacheDir::prepare(dir.clone()).unwrap();
    
    let path1 = app_lib::core::platform::new_output_path(&cache, "a:b/c?.pdf").unwrap();
    let path2 = app_lib::core::platform::new_output_path(&cache, "a:b/c?.pdf").unwrap();
    
    assert!(path1.starts_with(cache.exports_dir()));
    assert_ne!(path1, path2);
    
    // Check sanitization
    let name = path1.file_name().unwrap().to_string_lossy();
    assert!(!name.contains(':'));
    assert!(!name.contains('/'));
    assert!(!name.contains('?'));
    
    fs::remove_dir_all(dir).unwrap();
}

#[test]
fn test_new_output_dir() {
    let dir = std::env::temp_dir().join(format!("lpo-test-{}", Uuid::new_v4()));
    let cache = CacheDir::prepare(dir.clone()).unwrap();
    
    let path = app_lib::core::platform::new_output_dir(&cache).unwrap();
    assert!(path.starts_with(cache.exports_dir()));
    assert!(path.is_dir());
    assert!(fs::read_dir(&path).unwrap().next().is_none());
    
    fs::remove_dir_all(dir).unwrap();
}

#[test]
fn test_validator_nonexistent_and_traversal() {
    let dir = std::env::temp_dir().join(format!("lpo-test-{}", Uuid::new_v4()));
    let cache = CacheDir::prepare(dir.clone()).unwrap();
    let exports = cache.exports_dir();
    
    let nonexistent = exports.join("does_not_exist.pdf");
    assert!(check_inside_exports(&cache, &nonexistent).is_err());
    
    // Traversal to outside target when target does not exist
    let traversal = exports.join("..").join("secret.pdf");
    assert!(check_inside_exports(&cache, &traversal).is_err());
    
    fs::remove_dir_all(dir).unwrap();
}

#[test]
fn test_determine_mime_type() {
    use app_lib::core::platform::export::determine_mime_type;
    
    assert_eq!(determine_mime_type(&[]), "*/*");
    assert_eq!(determine_mime_type(&["a.pdf".into(), "b.pdf".into()]), "application/pdf");
    assert_eq!(determine_mime_type(&["a.png".into(), "b.png".into()]), "image/png");
    assert_eq!(determine_mime_type(&["a.jpg".into(), "b.jpeg".into()]), "image/jpeg");
    assert_eq!(determine_mime_type(&["a.pdf".into(), "b.png".into()]), "*/*");
    assert_eq!(determine_mime_type(&["a.txt".into()]), "application/octet-stream");
}
