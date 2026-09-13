import type { ToolDefinition } from "./types";
import { mergeTool } from "./merge";
import { organizeTool } from "./organize";
import { imagesToPdfTool } from "./images-to-pdf";
import { pdfToImagesTool } from "./pdf-to-images";
import { compressTool } from "./compress";

/**
 * Daftar alat. Urutan di sini = urutan kartu di beranda dan menu.
 * Menambah alat baru: buat folder `features/<alat>/`, lalu tambahkan satu baris di sini.
 */
export const tools: ToolDefinition[] = [
  mergeTool,
  organizeTool,
  imagesToPdfTool,
  pdfToImagesTool,
  compressTool,
];
