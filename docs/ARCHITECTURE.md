# Arsitektur

Local PDF Organizer adalah aplikasi desktop **Tauri v2**: backend Rust, frontend React + TypeScript.
Semua pemrosesan berjalan lokal; tidak ada koneksi jaringan saat runtime.

```
┌──────────────────────── WebView2 (frontend) ────────────────────────┐
│  src/app        kerangka: router, header, toggle bahasa             │
│  src/features   satu folder per alat  ──►  registry.ts              │
│  src/shared     ipc, intake file, i18n, komponen UI, util           │
└───────────────────────────────┬──────────────────────────────────────┘
                                │ invoke(command) / event "progress"
┌───────────────────────────────▼──────────────────────────────────────┐
│  src-tauri/src/features   satu folder per alat ──► features/mod.rs   │
│  src-tauri/src/core       error, state, registry file, cache,        │
│                           engine PDFium (thread khusus), lopdf, image│
└──────────────────────────────────────────────────────────────────────┘
```

## Lapisan dan aturan dependensi

| Lapisan | Boleh bergantung pada | Tidak boleh |
|---|---|---|
| `src/app` | `shared`, `features/registry` | isi folder fitur secara langsung |
| `src/features/<x>` | `shared`, `features/types` | fitur lain |
| `src/shared` | — | `features/*`, `app/*` |
| `src-tauri/src/features/<x>` | `core` | fitur lain |
| `src-tauri/src/core` | crate eksternal | `features::*` |

Aturan "fitur tidak saling mengimpor" diperiksa oleh `npm run lint:deps`
(`scripts/check-feature-deps.mjs`). Bila dua fitur butuh kode yang sama,
pindahkan ke `core` (Rust) atau `shared` (TS).

## Registrasi terpusat

- **Backend**: `src-tauri/src/features/mod.rs` → `handlers()` memuat `tauri::generate_handler![...]`
  untuk semua command. Ini satu-satunya tempat command didaftarkan.
- **Frontend**: `src/features/registry.ts` → array `tools: ToolDefinition[]`.
  Router (`app/routes.tsx`), menu header, kartu beranda, dan kamus i18n
  (`LanguageProvider`) semuanya diturunkan dari array ini.

## Kontrak IPC

Tiap fitur memiliki `types.rs` (Rust, `serde`) dan `ipc.ts` (TS) yang mencerminkan
nama command dan bentuk datanya. Komponen React tidak pernah memanggil `invoke`
secara langsung; semua lewat `shared/ipc/invoke.ts` yang menormalkan error menjadi
`IpcError { code, message }`. Kode error dipetakan ke teks terjemahan `error.<code>`.

Catatan penamaan: Tauri mengubah argumen `snake_case` di Rust menjadi `camelCase`
di sisi JS (`out_path` → `outPath`). Field **di dalam** struct (mis. `page_size`)
tetap mengikuti atribut `serde` di Rust.

## Alur data sebuah alat

1. Pengguna memilih file (dialog native) atau men-drop dari Explorer → path absolut.
2. `useFileIntake` memanggil `inspect_files(paths)` → backend membaca metadata
   (jumlah halaman via PDFium, dimensi gambar via `image`) dan menyimpan entri di
   `FileRegistry`. Frontend hanya memegang `id`.
3. Thumbnail: `render_thumbnail(id, page, width)` → PNG di folder cache aplikasi →
   dimuat lewat `convertFileSrc` (asset protocol, scope `$APPCACHE/**`).
4. Aksi utama (merge/organize/…) menerima `id` + opsi + path tujuan yang dipilih
   pengguna lewat dialog simpan/folder, lalu menulis hasil secara atomik.
5. Pekerjaan panjang mengirim event `progress { job_id, current, total }`.

## Engine PDFium

`pdfium-render` membungkus `pdfium.dll` (dibundel dari `src-tauri/pdfium/`).
PDFium bukan library thread-safe, sehingga semua pemanggilan dilakukan di satu
thread khusus (`core/pdf/engine/worker.rs`). Kode lain berkomunikasi lewat
`PdfWorkerHandle` (channel + `oneshot`). Job yang tersedia: `Inspect`,
`RenderPage`, `RenderPages` (dengan sink per halaman), dan `Assemble`.

Pencarian dll saat startup: `PDFIUM_DIR` → folder exe → `resource_dir()` →
`src-tauri/pdfium` (development). Gagal → dialog error, aplikasi berhenti.

## Manipulasi struktur PDF (lopdf)

Dipakai oleh gambar→PDF (menyusun dokumen dari nol) dan kompres (mengganti
XObject gambar, membuang objek tak terpakai, Flate semua stream). Helper generik
ada di `core/pdf/document.rs`; logika spesifik tetap di folder fiturnya.
