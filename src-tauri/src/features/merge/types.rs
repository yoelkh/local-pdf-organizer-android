use serde::Deserialize;
use uuid::Uuid;

/// Satu file PDF yang akan digabungkan, dengan rotasi opsional
/// yang diterapkan ke semua halamannya.
#[derive(Debug, Clone, Deserialize)]
pub struct MergeSpec {
    pub file: Uuid,
    /// Rotasi searah jarum jam (0/90/180/270).
    #[serde(default)]
    pub rotation: u16,
}
