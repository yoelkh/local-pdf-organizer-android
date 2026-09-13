use serde::Deserialize;

#[derive(Debug, Clone, Copy, PartialEq, Eq, Deserialize, Default)]
#[serde(rename_all = "lowercase")]
pub enum PageSizeOption {
    /// Ukuran halaman mengikuti ukuran gambar (96 piksel = 1 inci).
    #[default]
    Fit,
    A4,
    Letter,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq, Deserialize, Default)]
#[serde(rename_all = "lowercase")]
pub enum Orientation {
    /// Ikuti rasio gambar.
    #[default]
    Auto,
    Portrait,
    Landscape,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq, Deserialize, Default)]
#[serde(rename_all = "lowercase")]
pub enum Margin {
    #[default]
    None,
    Small,
    Big,
}

impl Margin {
    /// Besar margin dalam poin.
    pub fn points(self) -> f32 {
        match self {
            Margin::None => 0.0,
            Margin::Small => 20.0,
            Margin::Big => 50.0,
        }
    }
}

#[derive(Debug, Clone, Copy, Deserialize, Default)]
#[serde(rename_all = "snake_case")]
pub struct ImagesToPdfOptions {
    #[serde(default)]
    pub page_size: PageSizeOption,
    #[serde(default)]
    pub orientation: Orientation,
    #[serde(default)]
    pub margin: Margin,
}
