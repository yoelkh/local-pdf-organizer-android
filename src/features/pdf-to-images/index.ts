import { FileImage } from "lucide-react";
import type { ToolDefinition } from "@/features/types";
import { PdfToImagesPage } from "./PdfToImagesPage";
import { i18n } from "./i18n";

export const pdfToImagesTool: ToolDefinition = {
  id: "pdfToImages",
  route: "/pdf-to-images",
  icon: FileImage,
  accepts: ["pdf"],
  accent: "sky",
  Page: PdfToImagesPage,
  i18n,
};
