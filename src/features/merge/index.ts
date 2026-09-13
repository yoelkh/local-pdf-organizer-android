import { Layers } from "lucide-react";
import type { ToolDefinition } from "@/features/types";
import { MergePage } from "./MergePage";
import { i18n } from "./i18n";

export const mergeTool: ToolDefinition = {
  id: "merge",
  route: "/merge",
  icon: Layers,
  accent: "rose",
  Page: MergePage,
  i18n,
};
