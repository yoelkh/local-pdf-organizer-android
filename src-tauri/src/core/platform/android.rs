use std::path::PathBuf;
use tauri::{AppHandle, Manager};
use tauri_plugin_fs::{FsExt, OpenOptions};
use uuid::Uuid;
use std::io::copy;
use crate::core::error::{AppError, AppResult};
use crate::core::cache::CacheDir;
use super::SavedToDownloads;
use serde::{Deserialize, Serialize};
//

pub struct FileIo<R: tauri::Runtime>(pub tauri::plugin::PluginHandle<R>);

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
struct ShareArgs {
    paths: Vec<String>,
    mime_type: String,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
struct OpenFileArgs {
    path: String,
    mime_type: String,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
struct GetDisplayNameArgs {
    uri: String,
}

#[derive(Deserialize)]
struct GetDisplayNameRes {
    name: String,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
struct SaveToDownloadsArgs {
    paths: Vec<String>,
    sub_dir: String,
}

use super::export::determine_mime_type;

pub async fn import_file(app: &AppHandle, cache: &CacheDir, uri: &str) -> AppResult<(PathBuf, String)> {
    if !uri.starts_with("content://") {
        let path = PathBuf::from(uri);
        let name = path.file_name().map(|n| n.to_string_lossy().into_owned()).unwrap_or_default();
        return Ok((path, name));
    }
    
    let handle = app.state::<FileIo<tauri::Wry>>().0.clone();
    let uri_clone = uri.to_string();
    
    let res: GetDisplayNameRes = tauri::async_runtime::spawn_blocking(move || {
        handle.run_mobile_plugin("getDisplayName", GetDisplayNameArgs { uri: uri_clone })
    }).await.map_err(|e| AppError::Internal(e.to_string()))?
    .map_err(|e| AppError::Internal(e.to_string()))?;
        
    let name = crate::core::fs::sanitize_file_name(&res.name);
    let original_name = res.name;
    
    let dest_dir = cache.imports_dir().join(Uuid::new_v4().simple().to_string());
    std::fs::create_dir_all(&dest_dir)?;
    let dest_path = dest_dir.join(name);
    
    let app_clone = app.clone();
    let uri_clone = uri.to_string();
    let dest_clone = dest_path.clone();
    
    tauri::async_runtime::spawn_blocking(move || -> AppResult<()> {
        let mut opts = OpenOptions::new();
        opts.read(true);
        let url = url::Url::parse(&uri_clone).map_err(|e| AppError::Internal(e.to_string()))?;
        let mut src = app_clone.fs().open(tauri_plugin_fs::FilePath::Url(url), opts)
            .map_err(|e| AppError::Internal(e.to_string()))?;
        let mut dst = std::fs::File::create(&dest_clone)?;
        copy(&mut src, &mut dst)?;
        Ok(())
    }).await.map_err(|e| AppError::Internal(e.to_string()))??;

    Ok((dest_path, original_name))
}

pub async fn save_outputs_to_downloads(app: &AppHandle, paths: Vec<String>) -> AppResult<SavedToDownloads> {
    let app_clone = app.clone();
    let paths_clone = paths.clone();
    let res = tauri::async_runtime::spawn_blocking(move || {
        let handle = app_clone.state::<FileIo<tauri::Wry>>();
        handle.0.run_mobile_plugin::<serde_json::Value>("saveToDownloads", SaveToDownloadsArgs {
            paths: paths_clone,
            sub_dir: "Local PDF Organizer".to_string()
        }).map_err(|e| {
            let msg = e.to_string();
            if msg.contains("Unsupported") || msg.contains("API level") {
                AppError::Unsupported(msg)
            } else {
                AppError::Internal(msg)
            }
        })
    }).await.map_err(|e| AppError::Internal(e.to_string()))??;
    
    let count = res.get("count")
        .and_then(|v| v.as_u64())
        .unwrap_or(paths.len() as u64) as usize;
    
    Ok(SavedToDownloads {
        location: "Download/Local PDF Organizer".to_string(),
        count,
    })
}

pub async fn share_outputs(app: &AppHandle, paths: Vec<String>) -> AppResult<()> {
    if paths.is_empty() { return Ok(()); }
    let mime_type = determine_mime_type(&paths);
    
    let app_clone = app.clone();
    tauri::async_runtime::spawn_blocking(move || {
        let handle = app_clone.state::<FileIo<tauri::Wry>>();
        handle.0.run_mobile_plugin::<serde_json::Value>("share", ShareArgs {
            paths,
            mime_type,
        }).map_err(|e| AppError::Internal(e.to_string()))
    }).await.map_err(|e| AppError::Internal(e.to_string()))??;
    
    Ok(())
}

pub async fn open_output(app: &AppHandle, path: &str) -> AppResult<()> {
    let mime_type = determine_mime_type(&[path.to_string()]);
    let path = path.to_string();
    
    let app_clone = app.clone();
    tauri::async_runtime::spawn_blocking(move || {
        let handle = app_clone.state::<FileIo<tauri::Wry>>();
        handle.0.run_mobile_plugin::<serde_json::Value>("openFile", OpenFileArgs {
            path,
            mime_type,
        }).map_err(|e| {
            let msg = e.to_string();
            if msg.contains("Unsupported") {
                AppError::Unsupported(msg)
            } else {
                AppError::Internal(msg)
            }
        })
    }).await.map_err(|e| AppError::Internal(e.to_string()))??;
    
    Ok(())
}
