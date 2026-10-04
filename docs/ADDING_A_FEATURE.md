# Menambah alat baru

Contoh: alat **"Split PDF"** dengan id `split`. Hanya folder baru dan dua file registry
yang perlu disentuh. Tidak ada alat lain yang berubah.

## 1. Backend — `src-tauri/src/features/split/`

```
split/
├─ mod.rs        pub mod commands; pub mod service; pub mod types;
├─ types.rs      struct/enum request-response dengan #[derive(Serialize/Deserialize)]
├─ service.rs    logika murni (tanpa `tauri::`), pakai `crate::core::*`, ada #[cfg(test)]
└─ commands.rs   #[tauri::command] tipis: ambil State<AppState>, panggil service
```

Pola `commands.rs`:

```rust
#[tauri::command]
pub async fn split_pdf(state: State<'_, AppState>, file: Uuid, ranges: Vec<String>, out_dir: String)
    -> AppResult<Vec<OutputInfo>> {
    let entry = state.files.get(file)?;
    service::split(&state.pdf, &entry, &ranges, &PathBuf::from(out_dir)).await
}
```

- Pekerjaan berat non-PDFium (lopdf/image) → bungkus dengan `tauri::async_runtime::spawn_blocking`.
- Butuh PDFium → pakai `state.pdf` (`inspect`, `render_page`, `render_pages`, `assemble`).
  Bila perlu operasi PDFium baru, tambahkan varian `PdfJob` di `core/pdf/engine/worker.rs`.
- Butuh progress → terima `app: AppHandle` dan `job_id: String`, buat `Progress::new(app, job_id)`,
  kirim `progress.callback()` ke service.
- Kesalahan → kembalikan `AppError` (`core/error.rs`); jangan `unwrap` di command.

**Daftarkan** di `src-tauri/src/features/mod.rs`:

```rust
pub mod split;                       // 1 baris
// ...
split::commands::split_pdf,          // 1 baris di dalam generate_handler!
```

## 2. Frontend — `src/features/split/`

```
split/
├─ index.ts        export const splitTool: ToolDefinition = { id: "split", route: "/split", icon, accent, accepts: ["pdf"], Page, i18n }
├─ i18n.ts         { id: {...}, en: {...} } — wajib: split.title, split.description, split.cta
├─ ipc.ts          fungsi bertipe per command: export const splitPdf = (...) => ipc<...>("split_pdf", {...})
├─ SplitPage.tsx   halaman; pakai useFileIntake, ToolLayout, Dropzone, ResultPanel, dll. dari @/shared
├─ components/     (opsional) komponen khusus alat ini
└─ hooks/          (opsional) state kompleks khusus alat ini
```

Aturan:
- `accepts` menentukan jenis file yang bisa dititipkan alat lain lewat handoff; di halaman hasil,
  panggil `useHandoffActions("split", "pdf", paths)` dari `@/features/handoff` dan berikan ke `ResultPanel`.
- Butuh penyusunan per halaman (urut/putar/pilih)? Pakai `usePageBoard` + `PageTile` + `BoardViewer` + `BoardActions` dari `@/shared`.
- Agar jalan di Windows dan Android: tulis hasil ke path dari `prepareOutputFile` / `prepareOutputDir`
  (`@/shared/platform/outputs`), bukan langsung dari dialog; berikan `outputs` (daftar path hasil) ke
  `ResultPanel`; isi slot `options` / `action` / `secondary` milik `ToolLayout`; sediakan kunci
  `split.short` (label navigasi bawah) dan teks petunjuk versi sentuh bila ada.
- Semua kunci i18n diprefix `split.` supaya tidak bertabrakan.
- Hanya impor dari `@/shared/*` dan `@/features/types`. **Jangan** impor fitur lain.
- Argumen `invoke` memakai camelCase untuk parameter command Rust (`out_dir` → `outDir`).
- Warna aksen dipilih dari `Accent` di `shared/lib/colors.ts`; tambahkan entri baru di sana bila perlu.

**Daftarkan** di `src/features/registry.ts`:

```ts
import { splitTool } from "./split";   // 1 baris
export const tools = [ ..., splitTool ]; // 1 baris
```

Beranda, menu header, router, dan kamus bahasa otomatis ikut.

## 3. Verifikasi

```bash
npm run lint:deps                  # tidak ada impor lintas fitur
cd src-tauri && cargo test         # unit test service
npm run tauri dev                  # coba alatnya
```

## Kapan menyentuh `core` / `shared`?

Hanya bila kode dibutuhkan oleh **dua fitur atau lebih**. Contoh yang sudah ada:
`core/pdf/assemble.rs` dipakai merge dan organize; `shared/ui/Dropzone.tsx` dipakai semua alat.
Kode yang khusus satu alat tetap tinggal di folder alat itu.
