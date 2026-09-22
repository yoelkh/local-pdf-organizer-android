<p align="center">
  <img src="docs/banner.svg" alt="Local PDF Organizer" width="100%">
</p>

<p align="center">
  <a href="#-features">Features</a> ·
  <a href="#-installation">Installation</a> ·
  <a href="#-how-to-use">How to use</a> ·
  <a href="#-for-developers">For developers</a> ·
  <a href="#-architecture">Architecture</a>
</p>

<p align="center">
  <img alt="Platform" src="https://img.shields.io/badge/platform-Windows%2010%2F11-0078D6?logo=windows&logoColor=white">
  <img alt="Tauri" src="https://img.shields.io/badge/Tauri-2-24C8DB?logo=tauri&logoColor=white">
  <img alt="Rust" src="https://img.shields.io/badge/Rust-stable-F74C00?logo=rust&logoColor=white">
  <img alt="React" src="https://img.shields.io/badge/React-19-61DAFB?logo=react&logoColor=black">
  <img alt="License" src="https://img.shields.io/badge/license-MIT-22c55e">
</p>

**Local PDF Organizer** is an iLovePDF-style desktop app that runs **100% offline** on your PC.
No uploads, no size limits, and no file ever leaves your computer.

---

## ✨ Features

| | Tool | What it does |
|:-:|---|---|
| 🧩 | **Merge PDF** | Combine several PDFs; set the order with drag and drop, rotate whole files, or jump to per-page organizing. |
| 🗂️ | **Organize Pages** | Reorder, rotate, delete, or insert pages from other PDFs. Select many pages at once. |
| 🖼️ | **Images → PDF** | Turn JPG, PNG, WebP, BMP, GIF, and TIFF into a PDF. Reorder and rotate each image, pick page size, orientation, and margins. EXIF orientation is honored without re-encoding JPEGs. |
| 📷 | **PDF → Images** | Render one or many PDFs to PNG/JPG at 72/150/300 dpi, pick a page range, optionally bundle each as ZIP. |
| 🗜️ | **Compress PDF** | Three levels (low / recommended / extreme) with a before → after size report. |

Also included:

- 🔍 **Full-size page viewer** in every tool: double-click a page or hit the eye icon, then browse with the arrow keys, zoom, rotate, delete, or move a page without leaving the viewer.
- 🔠 **Adjustable thumbnail size**: a slider above every grid, from compact overview to large previews. Your choice is remembered per tool.
- 🔗 **Continue with the result**: every result screen offers one-click handoff to the other tools (e.g. merge → compress → convert) with the output preloaded.
- 🌐 **English** and **Bahasa Indonesia** UI (toggle in the header), plus drag-and-drop straight from File Explorer.

---

## 📦 Installation

Requires Windows 10/11 with WebView2 (preinstalled on Windows 11).

**Option 1 — Installer (easiest)**

1. Download `Local.PDF.Organizer_x.y.z_x64-setup.exe` from the [Releases](../../releases) page.
2. Run it, follow the steps, done.

**Option 2 — Build from source** → see [For developers](#-for-developers).

---

## 🚀 How to use

1. Open the app and pick a tool on the home screen.
2. **Drag files** into the window, or click **Select files**.
3. Arrange the order and options as you like (everything is drag and drop).
4. Click the action button, choose where to save, and open the result right away.

> 💡 In **Organize Pages**, click a page to select it, then rotate or delete many pages at once. **Add files** inserts pages from another PDF.
>
> 🔍 Can't tell pages apart? Drag the **thumbnail size** slider, or **double-click** any page to open it full size. Viewer keys: `←` `→` change page · `+` `-` zoom · `0` fit · `R` rotate · `Del` delete · `Esc` close.
>
> 🔄 **Updating?** The app does not update itself yet. Download the newest installer from Releases and run it over the installed version; no uninstall needed.

---

## 🛠️ For developers

### Prerequisites

| Tool | Version |
|---|---|
| [Node.js](https://nodejs.org) | ≥ 20 |
| [Rust](https://rustup.rs) | stable, target `x86_64-pc-windows-msvc` |
| Visual Studio Build Tools | *Desktop development with C++* workload |

`pdfium.dll` is already included in `src-tauri/pdfium/` (from [pdfium-binaries](https://github.com/bblanchon/pdfium-binaries)).

### Run

```bash
npm install
npm run tauri dev
```

The first Rust compile takes a few minutes; after that, frontend changes hot-reload.

### Build the installer

```bash
npm run tauri build
```

The output lands in `src-tauri/target/release/bundle/nsis/`.

### Test

```bash
cd src-tauri && cargo test        # 33 tests: services, layout, rotation matrices, EXIF, compression, PDFium pipeline
npm run build                     # type-check + frontend build
npm run lint:deps                 # cross-feature import rule
```

Sample files for manual testing: `cd src-tauri && cargo run --example make_samples` → `samples/` folder.

---

## 🏗️ Architecture

```
┌──────────────── Frontend (React + TS + Tailwind) ────────────────┐
│  src/app        router, header, language toggle                   │
│  src/features   one folder per tool  ──►  registry.ts             │
│  src/shared     ipc, file intake, page board, i18n, UI components │
└──────────────────────────────┬────────────────────────────────────┘
                               │  invoke(command) · "progress" event
┌──────────────────────────────▼────────────────────────────────────┐
│  src-tauri/src/features   one folder per tool ──► features/mod.rs  │
│  src-tauri/src/core       PDFium engine (dedicated thread), lopdf, │
│                           image, file registry, cache, errors      │
└────────────────────────────────────────────────────────────────────┘
```

The rules are simple:

- **One feature = one folder** on both the backend *and* the frontend (types · service · commands / index · i18n · ipc · Page).
- **Features never import each other.** Shared code lives in `core` (Rust) or `shared` (TS). Enforced automatically by `npm run lint:deps`.
- **One-line registration.** Adding a tool = create a folder + one line in `features/mod.rs` and one line in `features/registry.ts`. The home grid, menu, router, and translations follow automatically.

More detail: [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) · [docs/ADDING_A_FEATURE.md](docs/ADDING_A_FEATURE.md)

### Tech stack

| Layer | Choice |
|---|---|
| Desktop shell | [Tauri 2](https://tauri.app) (WebView2) |
| Rendering & page copying | [PDFium](https://pdfium.googlesource.com/pdfium/) via `pdfium-render` |
| PDF structure edits | `lopdf` |
| Image decode/encode | `image` |
| UI | React 19, TypeScript, Tailwind CSS 4, dnd-kit, lucide-react |

---

## ⚠️ Current limitations

- Encrypted (password-protected) PDFs are not supported yet.
- Merge/organize copies annotations, but interactive forms (AcroForm) may be lost.
- Compression works best on scanned or photo-heavy PDFs; text-only PDFs shrink only slightly.

---

## 📄 License

[MIT](LICENSE). PDFium is bundled under the BSD-3-Clause license.
