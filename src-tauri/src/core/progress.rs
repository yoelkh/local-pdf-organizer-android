//! Event kemajuan yang bisa dipakai fitur apa pun.
//! Frontend mendengarkan event `progress` dan memfilter berdasarkan `job_id`.

use serde::Serialize;
use tauri::{AppHandle, Emitter};

pub const PROGRESS_EVENT: &str = "progress";

#[derive(Debug, Clone, Serialize)]
pub struct ProgressEvent {
    pub job_id: String,
    pub current: u32,
    pub total: u32,
}

/// Pelapor kemajuan untuk satu pekerjaan.
#[derive(Clone)]
pub struct Progress {
    app: AppHandle,
    job_id: String,
}

impl Progress {
    pub fn new(app: AppHandle, job_id: impl Into<String>) -> Self {
        Self { app, job_id: job_id.into() }
    }

    pub fn emit(&self, current: u32, total: u32) {
        let _ = self.app.emit(
            PROGRESS_EVENT,
            ProgressEvent { job_id: self.job_id.clone(), current, total },
        );
    }

    /// Bentuk closure `Fn(current, total)` agar service tidak perlu tahu `tauri`.
    pub fn callback(&self) -> impl Fn(u32, u32) + Send + Sync + 'static {
        let this = self.clone();
        move |current, total| this.emit(current, total)
    }
}
