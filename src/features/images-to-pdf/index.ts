import { Images } from "lucide-react";
import type { ToolDefinition } from "@/features/types";
import { ImagesToPdfPage } from "./ImagesToPdfPage";
import { i18n } from "./i18n";

export const imagesToPdfTool: ToolDefinition = {
  id: "imagesToPdf",
  route: "/images-to-pdf",
  icon: Images,
  accent: "amber",
  Page: ImagesToPdfPage,
  i18n,
};
