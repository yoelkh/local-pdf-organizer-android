import { ipc } from "@/shared/ipc/invoke";
import type { OutputInfo } from "@/shared/ipc/types";

/** Mencerminkan `features::merge::commands::merge_pdfs`. */
export const mergePdfs = (files: string[], outPath: string) =>
  ipc<OutputInfo>("merge_pdfs", { files, outPath });
