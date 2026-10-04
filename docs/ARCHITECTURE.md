# Arsitektur

Local PDF Organizer adalah aplikasi desktop **Tauri v2**: backend Rust, frontend React + TypeScript.
Semua pemrosesan berjalan lokal; tidak ada koneksi jaringan saat runtime.

```
┌──────────────────────── WebView2 (frontend) ────────────────────────┐
│  src/app        kerangka: router, header, toggle bahasa             │
│  src/features   satu folder per alat  ──►  registry.ts              │
│  src/shared     ipc, intake file, papan halaman, i18n, UI, util     │
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
| `src/features/<x>` | `shared`, `features/{types,registry,handoff}` | fitur lain |
| `src/shared` | — | `features/*`, `app/*` |
| `src-tauri/src/features/<x>` | `core` | fitur lain |
| `src-tauri/src/core` | crate eksternal | `features::*` |

Aturan "fitur tidak saling mengimpor" diperiksa oleh `npm run lint:deps`
(`scripts/check-feature-deps.mjs`). Bila dua fitur butuh kode yang sama,
pindahkan ke `core` (Rust) atau `shared` (TS).

## Papan halaman bersama (`src/shared/pageboard`)

`usePageBoard(files, { onFileEmptied })` mengubah daftar file menjadi ubin halaman
(untuk gambar: satu ubin per file) dengan urutan, rotasi, dan seleksi. Komponen
pendampingnya di `src/shared/ui`: `PageTile` (ubin), `BoardViewer` (penampil
layar penuh dengan putar/hapus/pindah), `BoardActions` (aksi seleksi). Dipakai
oleh Atur Halaman dan Gambar→PDF; alat baru yang butuh penyusunan per halaman
cukup memakai ketiganya.

## Handoff antar alat

`src/shared/files/handoff.ts` menitipkan path; `useFileIntake` mengambil titipan
saat alat dibuka. `src/features/handoff.ts` (boleh diimpor fitur, seperti
`registry`) membangun aksi "Lanjutkan ke …" dari `ToolDefinition.accepts`.

## Satu basis kode, dua platform (Windows + Android)

Android dibangun dari repo yang sama lewat target Android Tauri 2 (`src-tauri/gen/android`).
Perbedaan platform dikurung di satu "seam" per sisi; kode fitur tidak bercabang per platform.

- **Frontend**: `src/shared/platform/index.ts` (`isMobile`, `isTouch`, `useIsCompact()`) dan
  `src/shared/platform/outputs.ts` (`prepareOutputFile`, `prepareOutputDir`, `prepareOutputFiles`,
  `saveOutputAs`, `saveOutputsToDownloads`, `shareOutputs`). Halaman alat memakai fungsi itu, lalu
  menyerahkan daftar file hasil ke `ResultPanel` (`outputs`), yang memilih aksi sesuai platform.
- **Backend**: `src-tauri/src/core/platform/` (`import.rs`, `export.rs`, `android.rs`) dan command
  tipis di `features/files`. Service fitur selalu menerima path nyata.
- **Android**: picker mengembalikan URI `content://`. `inspect_files` menyalinnya ke
  `<cache>/imports/`; hasil ditulis ke `<cache>/exports/` lalu dikirim lewat plugin Kotlin
  `FileIoPlugin` (MediaStore, FileProvider). Kontrak lengkap: `docs/android/IO_CONTRACT.md`.
- **Tata letak**: `ToolLayout` menerima slot `options`, `action`, `secondary`. Di layar ≥ `lg`
  ketiganya tampil sebagai kartu samping; di bawahnya `action` menjadi bilah bawah dan sisanya masuk
  `BottomSheet`. Navigasi di layar kecil memakai `BottomNav`.
- **Konfigurasi Tauri**: `tauri.conf.json` (umum), `tauri.windows.conf.json` (jendela, NSIS,
  `pdfium.dll`), `tauri.android.conf.json`. File platform digabung di atas file umum saat build.

Cara build dan batasan mesin: `docs/android/BUILD.md`.

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
