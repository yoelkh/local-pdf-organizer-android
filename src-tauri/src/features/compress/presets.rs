use super::types::CompressLevel;

/// Parameter konkret untuk satu level kompresi.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub struct Preset {
    /// Batas sisi terpanjang gambar dalam piksel. Dihitung dari "dpi setara"
    /// × ~11 inci (tinggi halaman umum) karena ukuran tampil sesungguhnya
    /// tidak dibaca dari content stream.
    pub max_side_px: u32,
    pub jpeg_quality: u8,
    pub strip_metadata: bool,
}

impl Preset {
    pub fn for_level(level: CompressLevel) -> Preset {
        match level {
            CompressLevel::Low => Preset { max_side_px: 3300, jpeg_quality: 85, strip_metadata: false },
            CompressLevel::Recommended => Preset { max_side_px: 1650, jpeg_quality: 75, strip_metadata: false },
            CompressLevel::Extreme => Preset { max_side_px: 1056, jpeg_quality: 55, strip_metadata: true },
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn presets_get_more_aggressive() {
        let low = Preset::for_level(CompressLevel::Low);
        let rec = Preset::for_level(CompressLevel::Recommended);
        let ext = Preset::for_level(CompressLevel::Extreme);
        assert!(low.max_side_px > rec.max_side_px && rec.max_side_px > ext.max_side_px);
        assert!(low.jpeg_quality > rec.jpeg_quality && rec.jpeg_quality > ext.jpeg_quality);
    }
}
