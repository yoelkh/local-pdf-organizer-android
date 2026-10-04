import { ipc } from "@/shared/ipc/invoke";
import type { FileInfo } from "@/shared/ipc/types";

export interface SkippedFile {
  path: string;
  reason: string;
}

export interface InspectResult {
  files: FileInfo[];
  skipped: SkippedFile[];
}

export interface SavedToDownloads {
  /** Human-readable location, e.g. "Download/Local PDF Organizer". */
  location: string;
  count: number;
}

/** Daftarkan path ke registry backend dan ambil metadatanya. */
export const inspectFiles = (paths: string[]) => ipc<InspectResult>("inspect_files", { paths });

export const removeFile = (id: string) => ipc<void>("remove_file", { id });

/** Path PNG thumbnail (0-based `page`) di cache; muat dengan `convertFileSrc`. */
export const renderThumbnail = (id: string, page: number, width: number) =>
  ipc<string>("render_thumbnail", { id, page, width });

/** Buka file/folder hasil dengan aplikasi default. */
export const openOutput = (path: string) => ipc<void>("open_output", { path });

/** Tampilkan file hasil di File Explorer. */
export const revealOutput = (path: string) => ipc<void>("reveal_output", { path });

/** Buat jalur baru di cache exports/ untuk satu file hasil. */
export const newOutputPath = (fileName: string) =>
  ipc<string>("new_output_path", { fileName });

/** Buat direktori baru di cache exports/ untuk hasil banyak file. */
export const newOutputDir = () =>
  ipc<string>("new_output_dir");

/** Salin file hasil dari cache ke lokasi tujuan pilihan pengguna. */
export const saveOutput = (path: string, destination: string) =>
  ipc<void>("save_output", { path, destination });

/** Salin berkas hasil ke folder publik Downloads (Android MediaStore). */
export const saveOutputsToDownloads = (paths: string[]) =>
  ipc<SavedToDownloads>("save_outputs_to_downloads", { paths });

/** Buka lembar bagikan sistem Android untuk berkas hasil. */
export const shareOutputs = (paths: string[]) =>
  ipc<void>("share_outputs", { paths });

