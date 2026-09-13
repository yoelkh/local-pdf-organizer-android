//! Perhitungan ukuran halaman dan penempatan gambar (semua dalam poin).

use super::types::{ImagesToPdfOptions, Orientation, PageSizeOption};

/// 96 piksel gambar = 1 inci = 72 poin.
const PX_TO_PT: f32 = 72.0 / 96.0;
const A4: (f32, f32) = (595.276, 841.89);
const LETTER: (f32, f32) = (612.0, 792.0);

#[derive(Debug, Clone, Copy, PartialEq)]
pub struct PageLayout {
    pub page_width: f32,
    pub page_height: f32,
    /// Posisi kiri-bawah gambar.
    pub x: f32,
    pub y: f32,
    pub width: f32,
    pub height: f32,
}

pub fn compute(img_width_px: u32, img_height_px: u32, opts: &ImagesToPdfOptions) -> PageLayout {
    let img_w = img_width_px.max(1) as f32;
    let img_h = img_height_px.max(1) as f32;
    let margin = opts.margin.points();

    match opts.page_size {
        PageSizeOption::Fit => {
            let width = img_w * PX_TO_PT;
            let height = img_h * PX_TO_PT;
            PageLayout {
                page_width: width + 2.0 * margin,
                page_height: height + 2.0 * margin,
                x: margin,
                y: margin,
                width,
                height,
            }
        }
        PageSizeOption::A4 | PageSizeOption::Letter => {
            let base = if opts.page_size == PageSizeOption::A4 { A4 } else { LETTER };
            let landscape = match opts.orientation {
                Orientation::Auto => img_w > img_h,
                Orientation::Landscape => true,
                Orientation::Portrait => false,
            };
            let (page_width, page_height) = if landscape { (base.1, base.0) } else { base };

            let avail_w = (page_width - 2.0 * margin).max(1.0);
            let avail_h = (page_height - 2.0 * margin).max(1.0);
            let scale = (avail_w / img_w).min(avail_h / img_h);
            let width = img_w * scale;
            let height = img_h * scale;

            PageLayout {
                page_width,
                page_height,
                x: (page_width - width) / 2.0,
                y: (page_height - height) / 2.0,
                width,
                height,
            }
        }
    }
}

#[cfg(test)]
mod tests {
    use super::super::types::Margin;
    use super::*;

    #[test]
    fn fit_uses_image_size_at_96_dpi() {
        let l = compute(960, 480, &ImagesToPdfOptions::default());
        assert!((l.page_width - 720.0).abs() < 0.01);
        assert!((l.page_height - 360.0).abs() < 0.01);
        assert_eq!(l.x, 0.0);
    }

    #[test]
    fn a4_auto_picks_landscape_for_wide_images_and_centers() {
        let opts = ImagesToPdfOptions {
            page_size: PageSizeOption::A4,
            orientation: Orientation::Auto,
            margin: Margin::Small,
        };
        let l = compute(2000, 1000, &opts);
        assert!(l.page_width > l.page_height);
        assert!(l.width <= l.page_width - 40.0 + 0.01);
        assert!((l.x * 2.0 + l.width - l.page_width).abs() < 0.01);
        assert!((l.y * 2.0 + l.height - l.page_height).abs() < 0.01);
    }

    #[test]
    fn letter_portrait_is_forced_when_requested() {
        let opts = ImagesToPdfOptions {
            page_size: PageSizeOption::Letter,
            orientation: Orientation::Portrait,
            margin: Margin::None,
        };
        let l = compute(300, 100, &opts);
        assert_eq!((l.page_width, l.page_height), (612.0, 792.0));
        assert!((l.width - 612.0).abs() < 0.01);
    }
}
