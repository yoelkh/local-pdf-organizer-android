//! Thread khusus PDFium dan antrean job-nya.

use std::path::PathBuf;
use std::sync::mpsc;

use image::DynamicImage;
use pdfium_render::prelude::*;
use tokio::sync::oneshot;

use crate::core::error::{AppError, AppResult};
use crate::core::pdf::assemble::{self, PageRef};
use crate::core::pdf::render;

use super::bindings;

/// Metadata dasar sebuah PDF.
#[derive(Debug, Clone, Copy)]
pub struct PdfInfo {
    pub pages: u32,
    /// Ukuran halaman pertama dalam poin.
    pub width: f32,
    pub height: f32,
}

/// Target ukuran render.
#[derive(Debug, Clone, Copy)]
pub enum RenderTarget {
    /// Lebar piksel tetap (tinggi mengikuti rasio halaman).
    Width(u32),
    /// Resolusi dalam dot per inch.
    Dpi(f32),
}

/// Penerima gambar per halaman saat merender banyak halaman.
/// Dipanggil di thread worker; argumen: (urutan ke-n, indeks halaman, gambar).
pub type PageSink = Box<dyn FnMut(u32, u32, DynamicImage) -> AppResult<()> + Send>;

type Reply<T> = oneshot::Sender<AppResult<T>>;

enum PdfJob {
    Inspect {
        path: PathBuf,
        reply: Reply<PdfInfo>,
    },
    RenderPage {
        path: PathBuf,
        page_index: u32,
        target: RenderTarget,
        reply: Reply<DynamicImage>,
    },
    RenderPages {
        path: PathBuf,
        page_indices: Vec<u32>,
        target: RenderTarget,
        sink: PageSink,
        reply: Reply<()>,
    },
    Assemble {
        pages: Vec<PageRef>,
        reply: Reply<Vec<u8>>,
    },
}

/// Handle yang aman dibagikan antar thread untuk mengirim job ke worker PDFium.
pub struct PdfWorkerHandle {
    tx: mpsc::Sender<PdfJob>,
}

impl PdfWorkerHandle {
    /// Jalankan thread worker. Gagal bila `pdfium.dll` tidak dapat dimuat.
    pub fn start(extra_dirs: Vec<PathBuf>) -> AppResult<Self> {
        let (tx, rx) = mpsc::channel::<PdfJob>();
        let (ready_tx, ready_rx) = mpsc::channel::<AppResult<String>>();

        std::thread::Builder::new()
            .name("pdfium-worker".into())
            .spawn(move || {
                let pdfium = match bindings::bind(&extra_dirs) {
                    Ok((pdfium, location)) => {
                        let _ = ready_tx.send(Ok(location));
                        pdfium
                    }
                    Err(e) => {
                        let _ = ready_tx.send(Err(e));
                        return;
                    }
                };
                for job in rx {
                    handle_job(&pdfium, job);
                }
            })
            .map_err(|e| AppError::Engine(format!("cannot spawn worker: {e}")))?;

        match ready_rx.recv() {
            Ok(Ok(location)) => {
                tracing::info!("PDFium loaded from {location}");
                Ok(Self { tx })
            }
            Ok(Err(e)) => Err(e),
            Err(_) => Err(AppError::Engine("worker thread exited early".into())),
        }
    }

    async fn submit<T>(&self, build: impl FnOnce(Reply<T>) -> PdfJob) -> AppResult<T> {
        let (tx, rx) = oneshot::channel();
        self.tx
            .send(build(tx))
            .map_err(|_| AppError::Engine("pdf worker is not running".into()))?;
        rx.await
            .map_err(|_| AppError::Engine("pdf worker dropped the request".into()))?
    }

    pub async fn inspect(&self, path: PathBuf) -> AppResult<PdfInfo> {
        self.submit(|reply| PdfJob::Inspect { path, reply }).await
    }

    pub async fn render_page(
        &self,
        path: PathBuf,
        page_index: u32,
        target: RenderTarget,
    ) -> AppResult<DynamicImage> {
        self.submit(|reply| PdfJob::RenderPage { path, page_index, target, reply })
            .await
    }

    /// Render banyak halaman dari satu dokumen; setiap hasil diserahkan ke `sink`.
    pub async fn render_pages(
        &self,
        path: PathBuf,
        page_indices: Vec<u32>,
        target: RenderTarget,
        sink: PageSink,
    ) -> AppResult<()> {
        self.submit(|reply| PdfJob::RenderPages { path, page_indices, target, sink, reply })
            .await
    }

    /// Susun PDF baru dari daftar halaman; hasil berupa bytes PDF.
    pub async fn assemble(&self, pages: Vec<PageRef>) -> AppResult<Vec<u8>> {
        self.submit(|reply| PdfJob::Assemble { pages, reply }).await
    }
}

fn handle_job(pdfium: &Pdfium, job: PdfJob) {
    match job {
        PdfJob::Inspect { path, reply } => {
            let _ = reply.send(inspect(pdfium, &path));
        }
        PdfJob::RenderPage { path, page_index, target, reply } => {
            let result = pdfium
                .load_pdf_from_file(&path, None)
                .map_err(AppError::from)
                .and_then(|doc| render::render_page(&doc, page_index, target));
            let _ = reply.send(result);
        }
        PdfJob::RenderPages { path, page_indices, target, mut sink, reply } => {
            let result = pdfium
                .load_pdf_from_file(&path, None)
                .map_err(AppError::from)
                .and_then(|doc| {
                    for (n, &index) in page_indices.iter().enumerate() {
                        let img = render::render_page(&doc, index, target)?;
                        sink(n as u32, index, img)?;
                    }
                    Ok(())
                });
            let _ = reply.send(result);
        }
        PdfJob::Assemble { pages, reply } => {
            let _ = reply.send(assemble::assemble(pdfium, &pages));
        }
    }
}

fn inspect(pdfium: &Pdfium, path: &PathBuf) -> AppResult<PdfInfo> {
    let doc = pdfium.load_pdf_from_file(path, None)?;
    let pages = doc.pages();
    let count = pages.len();
    if count == 0 {
        return Err(AppError::InvalidInput("PDF has no pages".into()));
    }
    let first = pages.get(0)?;
    Ok(PdfInfo {
        pages: count as u32,
        width: first.width().value,
        height: first.height().value,
    })
}

#[cfg(test)]
pub mod test_support {
    //! PDFium hanya boleh diinisialisasi sekali per proses, jadi semua test
    //! berbagi satu worker.

    use std::sync::OnceLock;

    use super::PdfWorkerHandle;

    static WORKER: OnceLock<PdfWorkerHandle> = OnceLock::new();

    pub fn worker() -> &'static PdfWorkerHandle {
        WORKER.get_or_init(|| PdfWorkerHandle::start(Vec::new()).expect("pdfium available"))
    }

    pub fn block_on<F: std::future::Future>(fut: F) -> F::Output {
        tokio::runtime::Builder::new_current_thread()
            .build()
            .unwrap()
            .block_on(fut)
    }
}
