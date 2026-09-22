import { Minimize2 } from "lucide-react";
import type { ToolDefinition } from "@/features/types";
import { CompressPage } from "./CompressPage";
import { i18n } from "./i18n";

export const compressTool: ToolDefinition = {
  id: "compress",
  route: "/compress",
  icon: Minimize2,
  accepts: ["pdf"],
  accent: "emerald",
  Page: CompressPage,
  i18n,
};
