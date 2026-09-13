use serde::Deserialize;
use uuid::Uuid;

/// Satu halaman di dokumen hasil, seperti disusun pengguna di UI.
#[derive(Debug, Clone, Deserialize)]
pub struct PageSpec {
    /// Id file sumber di registry.
    pub file: Uuid,
    /// Indeks halaman 0-based di file sumber.
    pub page: u32,
    /// Rotasi tambahan searah jarum jam (0/90/180/270).
    #[serde(default)]
    pub rotation: u16,
}
