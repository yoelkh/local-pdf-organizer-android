//! Uji integrasi jalur PDFium lewat `PdfWorkerHandle`: inspeksi, render, dan assemble.
//! Membutuhkan `pdfium.dll` di `src-tauri/pdfium/` (fallback pencarian saat development).

use std::path::PathBuf;
use std::sync::{Arc, Mutex, OnceLock};

use app_lib::core::pdf::assemble::{assemble_to_file, PageRef};
use app_lib::core::pdf::document::{append_page, draw_image_content, new_blank_document, raw_xobject};
use app_lib::core::pdf::engine::{PdfWorkerHandle, RenderTarget};
use image::GenericImageView;

static WORKER: OnceLock<PdfWorkerHandle> = OnceLock::new();

fn worker() -> &'static PdfWorkerHandle {
    WORKER.get_or_init(|| PdfWorkerHandle::start(Vec::new()).expect("pdfium.dll available"))
}

fn block_on<F: std::future::Future>(fut: F) -> F::Output {
    tokio::runtime::Builder::new_current_thread().build().unwrap().block_on(fut)
}

fn temp_dir() -> PathBuf {
    let dir = std::env::temp_dir().join(format!("lpo-it-{}", uuid::Uuid::new_v4()));
    std::fs::create_dir_all(&dir).unwrap();
    dir
}

/// PDF dengan `n` halaman; tiap halaman berisi satu warna solid berbeda agar bisa dikenali saat dirender.
fn colored_pdf(path: &PathBuf, colors: &[[u8; 3]], landscape: bool) {
    let (mut doc, pages_id) = new_blank_document();
    let (w, h) = if landscape { (300.0, 200.0) } else { (200.0, 300.0) };
    for c in colors {
        let img = image::RgbImage::from_pixel(4, 4, image::Rgb(*c));
        let id = doc.add_object(raw_xobject(4, 4, false, img.into_raw()));
        append_page(&mut doc, pages_id, w, h, &[("Im0", id)], draw_image_content("Im0", 0.0, 0.0, w, h)).unwrap();
    }
    doc.save(path).unwrap();
}

#[test]
fn inspect_reports_page_count_and_size() {
    let dir = temp_dir();
    let a = dir.join("a.pdf");
    colored_pdf(&a, &[[255, 0, 0], [0, 255, 0]], false);

    let info = block_on(worker().inspect(a.clone())).unwrap();
    assert_eq!(info.pages, 2);
    assert!((info.width - 200.0).abs() < 0.5 && (info.height - 300.0).abs() < 0.5);
    std::fs::remove_dir_all(dir).unwrap();
}

#[test]
fn render_page_matches_target_width_and_content() {
    let dir = temp_dir();
    let a = dir.join("a.pdf");
    colored_pdf(&a, &[[255, 0, 0], [0, 0, 255]], false);

    let img = block_on(worker().render_page(a.clone(), 1, RenderTarget::Width(100))).unwrap();
    assert_eq!(img.width(), 100);
    assert_eq!(img.height(), 150);
    let px = img.get_pixel(50, 75);
    assert!(px[2] > 200 && px[0] < 60, "expected blue page, got {px:?}");

    // DPI: 200pt lebar × 144dpi / 72 = 400px
    let img = block_on(worker().render_page(a.clone(), 0, RenderTarget::Dpi(144.0))).unwrap();
    assert_eq!(img.width(), 400);
    std::fs::remove_dir_all(dir).unwrap();
}

#[test]
fn render_pages_streams_each_page_to_sink() {
    let dir = temp_dir();
    let a = dir.join("a.pdf");
    colored_pdf(&a, &[[255, 0, 0], [0, 255, 0], [0, 0, 255]], false);

    let seen = Arc::new(Mutex::new(Vec::new()));
    let sink_seen = Arc::clone(&seen);
    block_on(worker().render_pages(
        a.clone(),
        vec![2, 0],
        RenderTarget::Width(20),
        Box::new(move |n, index, img| {
            sink_seen.lock().unwrap().push((n, index, img.get_pixel(10, 15).0));
            Ok(())
        }),
    ))
    .unwrap();

    let seen = seen.lock().unwrap();
    assert_eq!(seen.len(), 2);
    assert_eq!((seen[0].0, seen[0].1), (0, 2));
    assert!(seen[0].2[2] > 200, "first sink call should be the blue page");
    assert_eq!((seen[1].0, seen[1].1), (1, 0));
    assert!(seen[1].2[0] > 200, "second sink call should be the red page");
    std::fs::remove_dir_all(dir).unwrap();
}

#[test]
fn assemble_reorders_across_documents_and_rotates() {
    let dir = temp_dir();
    let a = dir.join("a.pdf");
    let b = dir.join("b.pdf");
    colored_pdf(&a, &[[255, 0, 0], [0, 255, 0]], false);
    colored_pdf(&b, &[[0, 0, 255]], false);

    let out = dir.join("out.pdf");
    let pages = vec![
        PageRef { path: b.clone(), page_index: 0, rotation: 0 },
        PageRef { path: a.clone(), page_index: 1, rotation: 90 },
        PageRef { path: a.clone(), page_index: 0, rotation: 0 },
    ];
    let info = block_on(assemble_to_file(worker(), pages, &out)).unwrap();
    assert_eq!(info.pages, 3);
    assert!(info.size > 0);

    // Halaman 1 = biru (dari b), halaman 3 = merah (dari a), halaman 2 diputar → landscape.
    let p1 = block_on(worker().render_page(out.clone(), 0, RenderTarget::Width(20))).unwrap();
    assert!(p1.get_pixel(10, 15)[2] > 200);
    let p3 = block_on(worker().render_page(out.clone(), 2, RenderTarget::Width(20))).unwrap();
    assert!(p3.get_pixel(10, 15)[0] > 200);
    let p2 = block_on(worker().render_page(out.clone(), 1, RenderTarget::Width(30))).unwrap();
    assert_eq!(p2.height(), 20, "rotated page should be landscape (30x20)");
    assert!(p2.get_pixel(15, 10)[1] > 200, "rotated page should be green");

    let info = block_on(worker().inspect(out.clone())).unwrap();
    assert_eq!(info.pages, 3);
    std::fs::remove_dir_all(dir).unwrap();
}

#[test]
fn assemble_rejects_out_of_range_page() {
    let dir = temp_dir();
    let a = dir.join("a.pdf");
    colored_pdf(&a, &[[255, 0, 0]], true);
    let out = dir.join("out.pdf");
    let err = block_on(assemble_to_file(
        worker(),
        vec![PageRef { path: a.clone(), page_index: 5, rotation: 0 }],
        &out,
    ));
    assert!(err.is_err());
    assert!(!out.exists());
    std::fs::remove_dir_all(dir).unwrap();
}
