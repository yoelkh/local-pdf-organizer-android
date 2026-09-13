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
