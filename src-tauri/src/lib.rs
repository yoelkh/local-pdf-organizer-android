//! Local PDF Organizer — backend Tauri.
//!
//! Struktur:
//! - `core`     : primitif bersama (error, state, registry file, engine PDFium, helper lopdf/image)
//! - `features` : satu folder per alat (merge, organize, images_to_pdf, pdf_to_images, compress, files)
//!
//! Aturan dependensi: `features::* -> core`. Fitur tidak saling mengimpor.

pub mod core;
pub mod features;

use tauri::Manager;
use tauri_plugin_dialog::{DialogExt, MessageDialogKind};

use crate::core::state::AppState;

pub fn run() {
    init_tracing();

    tauri::Builder::default()
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_opener::init())
        .setup(|app| {
            match AppState::init(app.handle()) {
                Ok(state) => {
                    app.manage(state);
                    Ok(())
                }
                Err(e) => {
                    tracing::error!("startup failed: {e}");
                    app.dialog()
                        .message(format!(
                            "Aplikasi tidak bisa dimulai.\n\n{e}\n\nPastikan pdfium.dll berada di folder aplikasi."
                        ))
                        .title("Local PDF Organizer")
                        .kind(MessageDialogKind::Error)
                        .blocking_show();
                    Err(Box::new(e))
                }
            }
        })
        .invoke_handler(features::handlers())
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}

fn init_tracing() {
    use tracing_subscriber::EnvFilter;
    let filter = EnvFilter::try_from_default_env().unwrap_or_else(|_| EnvFilter::new("info"));
    let _ = tracing_subscriber::fmt().with_env_filter(filter).try_init();
}
