import { ipc } from "@/shared/ipc/invoke";
import type { OutputInfo } from "@/shared/ipc/types";

/** Mencerminkan `features::merge::types::MergeSpec`. */
export interface MergeSpec {
  file: string;
  /** Rotasi semua halaman file ini: 0 / 90 / 180 / 270. */
  rotation: number;
}

/** Mencerminkan `features::merge::commands::merge_pdfs`. */
export const mergePdfs = (files: MergeSpec[], outPath: string) =>
  ipc<OutputInfo>("merge_pdfs", { files, outPath });
