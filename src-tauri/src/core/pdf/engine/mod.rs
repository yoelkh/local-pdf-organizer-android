//! Engine PDFium.
//!
//! `Pdfium` dari `pdfium-render` tidak `Send`, dan PDFium sendiri bukan library
//! thread-safe. Karena itu semua pemanggilan PDFium dijalankan di satu thread
//! khusus (`worker`). Bagian lain aplikasi berbicara dengan thread itu lewat
//! `PdfWorkerHandle` yang aman dibagikan antar thread.

pub mod bindings;
pub mod worker;

pub use worker::{PageSink, PdfInfo, PdfWorkerHandle, RenderTarget};
