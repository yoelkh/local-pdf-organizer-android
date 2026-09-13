//! Registry file yang sedang dibuka pengguna. Frontend selalu merujuk
//! file lewat `id`, bukan path, supaya path tidak berseliweran di UI.

pub mod inspect;
pub mod registry;
pub mod types;

pub use registry::FileRegistry;
pub use types::{FileEntry, FileInfo, FileKind, OutputInfo};
