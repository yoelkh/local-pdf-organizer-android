import { ipc } from "@/shared/ipc/invoke";

/** Mencerminkan `features::pdf_to_images::types`. */
export type OutputFormat = "png" | "jpg";

export interface PdfToImagesOptions {
  format: OutputFormat;
  dpi: number;
  /** Rentang 1-based ("1-3,5"); kosong/null = semua halaman. */
  pages: string | null;
  zip: boolean;
}

export interface PdfToImagesResult {
  files: string[];
  zip_path: string | null;
  out_dir: string;
  count: number;
}

export const pdfToImages = (
  file: string,
  options: PdfToImagesOptions,
  outDir: string,
  jobId: string,
) => ipc<PdfToImagesResult>("pdf_to_images", { file, options, outDir, jobId });
