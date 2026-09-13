use serde::Serialize;

/// Error tunggal yang dikembalikan semua command ke frontend.
/// Diserialisasi sebagai `{ code, message }` supaya UI bisa
/// menerjemahkan berdasarkan `code` dan menampilkan `message` sebagai detail.
#[derive(Debug, thiserror::Error)]
pub enum AppError {
    #[error("{0}")]
    Io(#[from] std::io::Error),
    #[error("file not found: {0}")]
    FileNotFound(String),
    #[error("unsupported format: {0}")]
    Unsupported(String),
    #[error("invalid input: {0}")]
    InvalidInput(String),
    #[error("pdf error: {0}")]
    Pdf(String),
    #[error("image error: {0}")]
    Image(String),
    #[error("pdf engine unavailable: {0}")]
    Engine(String),
    #[error("{0}")]
    Internal(String),
}

impl AppError {
    pub fn code(&self) -> &'static str {
        match self {
            AppError::Io(_) => "io",
            AppError::FileNotFound(_) => "not_found",
            AppError::Unsupported(_) => "unsupported",
            AppError::InvalidInput(_) => "invalid_input",
            AppError::Pdf(_) => "pdf",
            AppError::Image(_) => "image",
            AppError::Engine(_) => "engine",
            AppError::Internal(_) => "internal",
        }
    }
}

impl Serialize for AppError {
    fn serialize<S: serde::Serializer>(&self, serializer: S) -> Result<S::Ok, S::Error> {
        use serde::ser::SerializeStruct;
        let mut s = serializer.serialize_struct("AppError", 2)?;
        s.serialize_field("code", self.code())?;
        s.serialize_field("message", &self.to_string())?;
        s.end()
    }
}

impl From<pdfium_render::prelude::PdfiumError> for AppError {
    fn from(e: pdfium_render::prelude::PdfiumError) -> Self {
        AppError::Pdf(e.to_string())
    }
}

impl From<lopdf::Error> for AppError {
    fn from(e: lopdf::Error) -> Self {
        AppError::Pdf(e.to_string())
    }
}

impl From<image::ImageError> for AppError {
    fn from(e: image::ImageError) -> Self {
        AppError::Image(e.to_string())
    }
}

impl From<zip::result::ZipError> for AppError {
    fn from(e: zip::result::ZipError) -> Self {
        AppError::Internal(format!("zip: {e}"))
    }
}

impl From<anyhow::Error> for AppError {
    fn from(e: anyhow::Error) -> Self {
        AppError::Internal(e.to_string())
    }
}

impl From<tauri::Error> for AppError {
    fn from(e: tauri::Error) -> Self {
        AppError::Internal(e.to_string())
    }
}

pub type AppResult<T> = Result<T, AppError>;
