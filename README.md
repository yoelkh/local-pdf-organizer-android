<p align="center">
  <img src="docs/banner.svg" alt="Local PDF Organizer" width="100%">
</p>

<p align="center">
  <a href="#-fitur">Fitur</a> ·
  <a href="#-instalasi">Instalasi</a> ·
  <a href="#-cara-pakai">Cara pakai</a> ·
  <a href="#-untuk-developer">Untuk developer</a> ·
  <a href="#-arsitektur">Arsitektur</a> ·
  <a href="#english">English</a>
</p>

<p align="center">
  <img alt="Platform" src="https://img.shields.io/badge/platform-Windows%2010%2F11-0078D6?logo=windows&logoColor=white">
  <img alt="Tauri" src="https://img.shields.io/badge/Tauri-2-24C8DB?logo=tauri&logoColor=white">
  <img alt="Rust" src="https://img.shields.io/badge/Rust-stable-F74C00?logo=rust&logoColor=white">
  <img alt="React" src="https://img.shields.io/badge/React-19-61DAFB?logo=react&logoColor=black">
  <img alt="License" src="https://img.shields.io/badge/license-MIT-22c55e">
</p>

**Local PDF Organizer** adalah aplikasi desktop ala iLovePDF yang berjalan **100% offline** di PC Anda.
Tidak ada upload, tidak ada batas ukuran, tidak ada file yang meninggalkan komputer.

---

## ✨ Fitur

| | Alat | Yang bisa dilakukan |
|:-:|---|---|
| 🧩 | **Gabungkan PDF** | Satukan banyak PDF; urutan diatur dengan drag and drop. |
| 🗂️ | **Atur Halaman** | Urutkan ulang, putar, hapus, atau sisipkan halaman dari PDF lain. Pilih banyak halaman sekaligus. |
| 🖼️ | **Gambar → PDF** | JPG, PNG, WebP, BMP, GIF, TIFF menjadi PDF. Pilihan ukuran halaman, orientasi, margin. |
| 📷 | **PDF → Gambar** | Render halaman ke PNG/JPG pada 72/150/300 dpi, pilih rentang halaman, opsi ZIP. |
| 🗜️ | **Kompres PDF** | Tiga level (ringan / disarankan / ekstrem) dengan laporan ukuran sebelum → sesudah. |

Bonus: antarmuka **Bahasa Indonesia** dan **English** (toggle di pojok kanan atas), thumbnail halaman, drag file langsung dari File Explorer.

---

## 📦 Instalasi

Butuh Windows 10/11 dengan WebView2 (sudah bawaan Windows 11).

**Opsi 1 — Installer (paling mudah)**

1. Unduh `Local PDF Organizer_x.y.z_x64-setup.exe` dari halaman [Releases](../../releases).
2. Jalankan, ikuti langkahnya, selesai.

**Opsi 2 — Build sendiri** → lihat [Untuk developer](#-untuk-developer).

---

## 🚀 Cara pakai

1. Buka aplikasi dan pilih alat di beranda.
2. **Seret file** ke jendela aplikasi, atau klik **Pilih file**.
3. Atur urutan/opsi sesuai kebutuhan (semua drag and drop).
4. Klik tombol aksi, pilih lokasi simpan, dan hasilnya langsung bisa dibuka.

> 💡 Di **Atur Halaman**, klik halaman untuk memilih, lalu putar atau hapus banyak halaman sekaligus. Tombol **Tambah file** menyisipkan halaman dari PDF lain.

---

## 🛠️ Untuk developer

### Prasyarat

| Alat | Versi |
|---|---|
| [Node.js](https://nodejs.org) | ≥ 20 |
| [Rust](https://rustup.rs) | stable, target `x86_64-pc-windows-msvc` |
| Visual Studio Build Tools | komponen *Desktop development with C++* |

`pdfium.dll` sudah disertakan di `src-tauri/pdfium/` (dari [pdfium-binaries](https://github.com/bblanchon/pdfium-binaries)).

### Jalankan

```bash
npm install
npm run tauri dev
```

Kompilasi Rust pertama memakan beberapa menit; setelah itu perubahan frontend di-*hot reload*.

### Build installer

```bash
npm run tauri build
```

Hasil ada di `src-tauri/target/release/bundle/nsis/`.

### Uji

```bash
cd src-tauri && cargo test        # 28 test: service, layout, kompresi, pipeline PDFium
npm run build                     # type-check + build frontend
npm run lint:deps                 # aturan modularitas antar fitur
```

File contoh untuk uji manual: `cd src-tauri && cargo run --example make_samples` → folder `samples/`.

---

## 🏗️ Arsitektur

```
┌──────────────── Frontend (React + TS + Tailwind) ────────────────┐
│  src/app        router, header, toggle bahasa                     │
│  src/features   satu folder per alat  ──►  registry.ts            │
│  src/shared     ipc, intake file, i18n, komponen UI               │
└──────────────────────────────┬────────────────────────────────────┘
                               │  invoke(command) · event "progress"
┌──────────────────────────────▼────────────────────────────────────┐
│  src-tauri/src/features   satu folder per alat ──► features/mod.rs │
│  src-tauri/src/core       engine PDFium (thread khusus), lopdf,    │
│                           image, registry file, cache, error       │
└────────────────────────────────────────────────────────────────────┘
```

Prinsipnya sederhana:

- **Satu fitur = satu folder** di backend *dan* frontend (types · service · commands / index · i18n · ipc · Page).
- **Fitur tidak saling mengimpor.** Kode bersama tinggal di `core` (Rust) atau `shared` (TS). Diperiksa otomatis oleh `npm run lint:deps`.
- **Registrasi satu baris.** Menambah alat baru = buat folder + satu baris di `features/mod.rs` dan satu baris di `features/registry.ts`. Beranda, menu, router, dan kamus bahasa mengikuti otomatis.

Lebih detail: [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) · [docs/ADDING_A_FEATURE.md](docs/ADDING_A_FEATURE.md)

### Teknologi

| Lapisan | Pilihan |
|---|---|
| Shell desktop | [Tauri 2](https://tauri.app) (WebView2) |
| Render & salin halaman | [PDFium](https://pdfium.googlesource.com/pdfium/) via `pdfium-render` |
| Manipulasi struktur PDF | `lopdf` |
| Decode/encode gambar | `image` |
| UI | React 19, TypeScript, Tailwind CSS 4, dnd-kit, lucide-react |

---

## ⚠️ Batasan saat ini

- PDF terenkripsi (berkata sandi) belum didukung.
- Merge/organize menyalin anotasi, tetapi formulir interaktif (AcroForm) bisa hilang.
- Kompresi paling efektif untuk PDF hasil scan/foto; PDF teks murni hanya berkurang sedikit.

---

## 📄 Lisensi

[MIT](LICENSE). PDFium dibundel di bawah lisensi BSD-3-Clause.

---

<a id="english"></a>
## 🇬🇧 English

**Local PDF Organizer** is an iLovePDF-style desktop app that runs **100% offline** on Windows.
Merge PDFs, reorder/rotate/delete pages with drag and drop, convert images ↔ PDF, and compress —
nothing ever leaves your computer.

- **Install:** grab the installer from [Releases](../../releases), or build with `npm install && npm run tauri build`.
- **Develop:** `npm run tauri dev` (needs Node ≥ 20, Rust stable, MSVC Build Tools).
- **Stack:** Tauri 2 · Rust (PDFium, lopdf, image) · React 19 + TypeScript + Tailwind.
- **Structure:** one feature = one folder on both sides, no cross-feature imports, one-line registration.
  See [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) and [docs/ADDING_A_FEATURE.md](docs/ADDING_A_FEATURE.md).

The UI ships in Indonesian and English (toggle in the header).
