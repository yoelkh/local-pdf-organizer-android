import { ipc } from "@/shared/ipc/invoke";
import type { OutputInfo } from "@/shared/ipc/types";

/** Mencerminkan `features::organize::types::PageSpec`. */
export interface PageSpec {
  file: string;
  /** Indeks halaman 0-based. */
  page: number;
  /** 0 / 90 / 180 / 270. */
  rotation: number;
}

/** Mencerminkan `features::organize::commands::organize_pdf`. */
export const organizePdf = (pages: PageSpec[], outPath: string) =>
  ipc<OutputInfo>("organize_pdf", { pages, outPath });
