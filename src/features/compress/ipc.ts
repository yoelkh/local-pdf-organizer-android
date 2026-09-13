import { ipc } from "@/shared/ipc/invoke";

/** Mencerminkan `features::compress::types`. */
export type CompressLevel = "low" | "recommended" | "extreme";

export interface CompressResult {
  path: string;
  name: string;
  original_size: number;
  compressed_size: number;
  unchanged: boolean;
  images_processed: number;
  images_skipped: number;
}

export const compressPdf = (file: string, level: CompressLevel, outPath: string) =>
  ipc<CompressResult>("compress_pdf", { file, level, outPath });
