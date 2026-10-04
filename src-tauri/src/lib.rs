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

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    init_tracing();

    tauri::Builder::default()
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_opener::init())
        .plugin(core::platform::init_plugin())
        .setup(|app| {
            match AppState::init(app.handle()) {
                Ok(state) => {
                    app.manage(state);
                    Ok(())
                }
                Err(e) => {
                    tracing::error!("startup failed: {e}");
                        #[cfg(target_os = "android")]
                        let pdfium_name = "libpdfium.so";
                        #[cfg(not(target_os = "android"))]
                        let pdfium_name = "pdfium.dll";
                        
                        app.dialog()
                        .message(format!(
                            "Aplikasi tidak bisa dimulai. Pastikan {} berada di folder aplikasi.\n\
                             The app could not start. Make sure {} is in the application folder.\n\n{e}",
                             pdfium_name, pdfium_name
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

    #[cfg(target_os = "android")]
    {
        use tracing_subscriber::layer::SubscriberExt;
        use tracing_subscriber::util::SubscriberInitExt;
        tracing_subscriber::registry()
            .with(filter)
            .with(tracing_android::layer("local_pdf_organizer").unwrap())
            .try_init()
            .ok();
    }

    #[cfg(not(target_os = "android"))]
    {
        let _ = tracing_subscriber::fmt().with_env_filter(filter).try_init();
    }
}
