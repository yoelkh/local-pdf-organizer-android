//! Registrasi fitur backend.
//!
//! Setiap fitur adalah satu folder dengan konvensi:
//! - `types.rs`    : tipe request/response (`serde`)            [opsional]
//! - `service.rs`  : logika murni tanpa `tauri::`, bisa di-unit-test
//! - `commands.rs` : fungsi `#[tauri::command]` tipis yang memanggil service
//! - `mod.rs`      : `pub mod` untuk file di atas
//!
//! Menambah fitur baru = buat folder, tambahkan `pub mod`, lalu daftarkan
//! command-nya di `handlers()` di bawah. Tidak ada file lain yang perlu diubah.

pub mod compress;
pub mod files;
pub mod images_to_pdf;
pub mod merge;
pub mod organize;
pub mod pdf_to_images;

/// Semua command yang diekspos ke frontend, dikumpulkan di satu tempat.
pub fn handlers() -> impl Fn(tauri::ipc::Invoke<tauri::Wry>) -> bool + Send + Sync + 'static {
    tauri::generate_handler![
        // files
        files::commands::inspect_files,
        files::commands::remove_file,
        files::commands::render_thumbnail,
        files::commands::open_output,
        files::commands::reveal_output,
        // merge
        merge::commands::merge_pdfs,
        // organize
        organize::commands::organize_pdf,
        // images -> pdf
        images_to_pdf::commands::images_to_pdf,
        // pdf -> images
        pdf_to_images::commands::pdf_to_images,
        // compress
        compress::commands::compress_pdf,
    ]
}
