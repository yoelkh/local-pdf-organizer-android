import type { Dictionary } from "./LanguageProvider";

/** Teks umum (bukan milik satu fitur). Kunci fitur ada di `features/<fitur>/i18n.ts`. */
export const baseId: Dictionary = {
  "app.name": "Local PDF Organizer",

  "home.title": "Semua alat PDF Anda, sepenuhnya offline",
  "home.subtitle":
    "Gabungkan, susun ulang, konversi, dan kompres PDF langsung di PC ini. Tidak ada file yang meninggalkan komputer Anda.",

  "common.pickFiles": "Pilih file",
  "common.addMore": "Tambah file",
  "common.remove": "Hapus",
  "common.clear": "Bersihkan",
  "common.cancel": "Batal",
  "common.back": "Kembali",
  "common.startOver": "Mulai lagi",
  "common.openFile": "Buka file",
  "common.openFolder": "Buka folder",
  "common.processing": "Memproses...",
  "common.loadingFiles": "Membaca file...",
  "common.pages": "{n} halaman",
  "common.page": "Hal. {n}",
  "common.files": "{n} file",
  "common.options": "Pengaturan",
  "common.rotate": "Putar 90°",
  "common.selectAll": "Pilih semua",
  "common.deselect": "Batal pilih",
  "common.deleteSelected": "Hapus terpilih ({n})",
  "common.reset": "Reset",
  "common.saved": "Tersimpan",
  "common.result": "Hasil",
  "common.original": "Asli",
  "common.savings": "Hemat {pct}%",
  "common.saveAs": "Simpan sebagai...",
  "common.chooseFolder": "Pilih folder tujuan",

  "dropzone.pdf": "Seret file PDF ke sini",
  "dropzone.pdfSingle": "Seret satu file PDF ke sini",
  "dropzone.image": "Seret gambar ke sini",
  "dropzone.orClick": "atau klik tombol untuk memilih dari komputer",
  "dropzone.dropNow": "Lepaskan untuk menambahkan",
  "dropzone.formats.pdf": "Format: PDF",
  "dropzone.formats.image": "Format: JPG, PNG, WebP, BMP, GIF, TIFF",

  "intake.skippedType": "{n} file dilewati karena jenisnya tidak didukung di alat ini.",
  "intake.skippedFile": "Tidak bisa membaca {name}.",

  "result.title": "Selesai!",
  "result.savedTo": "Disimpan di",

  "error.io": "Gagal membaca atau menulis file.",
  "error.not_found": "File tidak ditemukan. Mungkin sudah dipindah atau dihapus.",
  "error.unsupported": "Format file tidak didukung (PDF terenkripsi juga belum didukung).",
  "error.invalid_input": "Masukan tidak valid.",
  "error.pdf": "PDF tidak bisa diproses. File mungkin rusak.",
  "error.image": "Gambar tidak bisa diproses.",
  "error.engine": "Mesin PDF tidak tersedia.",
  "error.internal": "Terjadi kesalahan tak terduga.",
  "error.detail": "Detail",
};
