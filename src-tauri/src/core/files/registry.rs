use std::collections::HashMap;
use std::sync::Mutex;

use uuid::Uuid;

use crate::core::error::{AppError, AppResult};

use super::types::FileEntry;

#[derive(Default)]
pub struct FileRegistry {
    inner: Mutex<HashMap<Uuid, FileEntry>>,
}

impl FileRegistry {
    pub fn insert(&self, entry: FileEntry) {
        self.inner.lock().expect("registry poisoned").insert(entry.id, entry);
    }

    pub fn get(&self, id: Uuid) -> AppResult<FileEntry> {
        self.inner
            .lock()
            .expect("registry poisoned")
            .get(&id)
            .cloned()
            .ok_or_else(|| AppError::FileNotFound(format!("id {id}")))
    }

    /// Ambil banyak entri sekaligus, mempertahankan urutan `ids`.
    pub fn get_many(&self, ids: &[Uuid]) -> AppResult<Vec<FileEntry>> {
        let map = self.inner.lock().expect("registry poisoned");
        ids.iter()
            .map(|id| {
                map.get(id)
                    .cloned()
                    .ok_or_else(|| AppError::FileNotFound(format!("id {id}")))
            })
            .collect()
    }

    pub fn remove(&self, id: Uuid) -> Option<FileEntry> {
        self.inner.lock().expect("registry poisoned").remove(&id)
    }
}
