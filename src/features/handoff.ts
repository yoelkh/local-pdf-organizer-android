import { useNavigate } from "react-router-dom";
import type { Accept } from "@/shared/files/accept";
import { setHandoff } from "@/shared/files/handoff";
import { useT } from "@/shared/i18n/useT";
import type { ResultAction } from "@/shared/ui/ResultPanel";
import { tools } from "./registry";
import type { ToolDefinition } from "./types";

/** Alat lain yang menerima file berjenis `kind`, di luar alat `exceptId`. */
export function toolsAccepting(kind: Accept, exceptId: string): ToolDefinition[] {
  return tools.filter((tool) => tool.id !== exceptId && tool.accepts.includes(kind));
}

/**
 * Aksi "Lanjutkan ke …" untuk `ResultPanel`: menitipkan `paths` lalu berpindah
 * ke alat tujuan, yang akan memuatnya otomatis.
 */
export function useHandoffActions(currentId: string, kind: Accept, paths: string[]): ResultAction[] {
  const navigate = useNavigate();
  const { t } = useT();
  return toolsAccepting(kind, currentId).map((tool) => ({
    id: tool.id,
    label: t("handoff.continueTo", { tool: t(`${tool.id}.title`) }),
    icon: tool.icon,
    accent: tool.accent,
    onClick: () => {
      setHandoff(paths);
      navigate(tool.route);
    },
  }));
}

/** Pindah ke alat `toolId` sambil membawa `paths` (mis. dari Merge ke Atur Halaman). */
export function useHandoffTo(toolId: string): ((paths: string[]) => void) | null {
  const navigate = useNavigate();
  const tool = tools.find((tl) => tl.id === toolId);
  if (!tool) return null;
  return (paths) => {
    setHandoff(paths);
    navigate(tool.route);
  };
}
