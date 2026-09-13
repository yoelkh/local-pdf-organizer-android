use std::fs::File;
use std::io::Write;
use std::path::{Path, PathBuf};
use std::sync::{Arc, Mutex};

use image::DynamicImage;

use crate::core::error::{AppError, AppResult};
use crate::core::files::{FileEntry, FileKind};
use crate::core::fs;
use crate::core::pdf::engine::{PageSink, PdfWorkerHandle, RenderTarget};
use crate::core::pdf::images;
use crate::core::pdf::page_range;

use super::types::{OutputFormat, PdfToImagesOptions, PdfToImagesResult};

pub const JPEG_QUALITY: u8 = 90;

/// Render halaman `entry` ke `out_dir`. `progress(current, total)` dipanggil per halaman.
pub async fn convert(
    pdf: &PdfWorkerHandle,
    entry: &FileEntry,
    opts: &PdfToImagesOptions,
    out_dir: &Path,
    progress: impl Fn(u32, u32) + Send + Sync + 'static,
) -> AppResult<PdfToImagesResult> {
    if entry.kind != FileKind::Pdf {
        return Err(AppError::InvalidInput(format!("{} is not a PDF", entry.name)));
    }
    let dpi = opts.dpi.clamp(36, 600) as f32;
    let indices = page_range::parse(opts.pages.as_deref().unwrap_or(""), entry.pages)?;
    let total = indices.len() as u32;
    fs::ensure_dir(out_dir)?;

    let stem = fs::sanitize_file_name(&fs::file_stem(&entry.path));
    let digits = total.to_string().len().max(3);
    let format = opts.format;
    let ext = format.extension();

    let written: Arc<Mutex<Vec<PathBuf>>> = Arc::new(Mutex::new(Vec::new()));
    let sink_written = Arc::clone(&written);
    let sink_dir = out_dir.to_path_buf();
    let sink_stem = stem.clone();

    let sink: PageSink = Box::new(move |n: u32, page_index: u32, img: DynamicImage| {
        let name = format!("{sink_stem}_page_{:0width$}", page_index + 1, width = digits);
        let path = fs::unique_path(&sink_dir, &name, ext);
        let bytes = match format {
            OutputFormat::Png => images::encode_png(&img)?,
            OutputFormat::Jpg => images::encode_jpeg(&img, JPEG_QUALITY)?,
        };
        fs::write_atomic(&path, &bytes)?;
        sink_written.lock().expect("sink poisoned").push(path);
        progress(n + 1, total);
        Ok(())
    });

    pdf.render_pages(entry.path.clone(), indices, RenderTarget::Dpi(dpi), sink)
        .await?;

    let files: Vec<PathBuf> = std::mem::take(&mut *written.lock().expect("sink poisoned"));

    if opts.zip {
        let zip_path = fs::unique_path(out_dir, &stem, "zip");
        zip_files(&files, &zip_path)?;
        for f in &files {
            let _ = std::fs::remove_file(f);
        }
        return Ok(PdfToImagesResult {
            files: Vec::new(),
            zip_path: Some(zip_path.to_string_lossy().into_owned()),
            out_dir: out_dir.to_string_lossy().into_owned(),
            count: total,
        });
    }

    Ok(PdfToImagesResult {
        files: files.iter().map(|p| p.to_string_lossy().into_owned()).collect(),
        zip_path: None,
        out_dir: out_dir.to_string_lossy().into_owned(),
        count: total,
    })
}

fn zip_files(files: &[PathBuf], zip_path: &Path) -> AppResult<()> {
    let file = File::create(zip_path)?;
    let mut zip = zip::ZipWriter::new(file);
    let options = zip::write::SimpleFileOptions::default()
        .compression_method(zip::CompressionMethod::Deflated);
    for path in files {
        let name = path
            .file_name()
            .map(|n| n.to_string_lossy().into_owned())
            .unwrap_or_else(|| "page".into());
        zip.start_file(name, options)?;
        let bytes = std::fs::read(path)?;
        zip.write_all(&bytes)?;
    }
    zip.finish()?;
    Ok(())
}
