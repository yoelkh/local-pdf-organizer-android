import { ipc } from "@/shared/ipc/invoke";
import type { OutputInfo } from "@/shared/ipc/types";

/** Mencerminkan `features::images_to_pdf::types`. */
export type PageSizeOption = "fit" | "a4" | "letter";
export type Orientation = "auto" | "portrait" | "landscape";
export type Margin = "none" | "small" | "big";

export interface ImagesToPdfOptions {
  page_size: PageSizeOption;
  orientation: Orientation;
  margin: Margin;
}

export const imagesToPdf = (images: string[], options: ImagesToPdfOptions, outPath: string) =>
  ipc<OutputInfo>("images_to_pdf", { images, options, outPath });
