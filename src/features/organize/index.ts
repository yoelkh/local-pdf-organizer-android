import { LayoutGrid } from "lucide-react";
import type { ToolDefinition } from "@/features/types";
import { OrganizePage } from "./OrganizePage";
import { i18n } from "./i18n";

export const organizeTool: ToolDefinition = {
  id: "organize",
  route: "/organize",
  icon: LayoutGrid,
  accepts: ["pdf"],
  accent: "violet",
  Page: OrganizePage,
  i18n,
};
