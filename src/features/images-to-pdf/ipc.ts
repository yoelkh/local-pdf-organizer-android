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

/** Mencerminkan `features::images_to_pdf::types::ImageSpec`. */
export interface ImageSpec {
  file: string;
  /** 0 / 90 / 180 / 270, searah jarum jam. */
  rotation: number;
}

export const imagesToPdf = (images: ImageSpec[], options: ImagesToPdfOptions, outPath: string) =>
  ipc<OutputInfo>("images_to_pdf", { images, options, outPath });
