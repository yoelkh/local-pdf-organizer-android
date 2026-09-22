import type { ReactNode } from "react";
import { ArrowRight, CheckCircle2, ExternalLink, FolderOpen, RotateCcw, type LucideIcon } from "lucide-react";
import { accentClasses, type Accent } from "@/shared/lib/colors";
import { openOutput, revealOutput } from "@/shared/files/ipc";
import { useT } from "@/shared/i18n/useT";
import { describeError } from "@/shared/i18n/errors";
import { useToast } from "@/shared/ui/Toast";
import { Button } from "./Button";

/** Tombol "Lanjutkan ke …" menuju alat lain. */
export interface ResultAction {
  id: string;
  label: string;
  icon: LucideIcon;
  accent: Accent;
  onClick: () => void;
}

interface Props {
  title?: string;
  /** Aksi lanjutan (handoff ke alat lain). */
  nextActions?: ResultAction[];
  /** Path file hasil (tombol "Buka file" + "Buka folder"). */
  filePath?: string;
  /** Path folder hasil (bila tidak ada satu file utama). */
  folderPath?: string;
  onStartOver: () => void;
  children?: ReactNode;
}

/** Panel hasil yang seragam untuk semua alat. */
export function ResultPanel({ title, filePath, folderPath, onStartOver, nextActions, children }: Props) {
  const { t } = useT();
  const toast = useToast();

  async function guard(action: () => Promise<void>) {
    try {
      await action();
    } catch (e) {
      toast.error(describeError(e, t));
    }
  }

  return (
    <div className="mx-auto max-w-2xl rounded-2xl border border-emerald-200 bg-white p-8 text-center shadow-sm">
      <div className="mx-auto grid h-16 w-16 place-items-center rounded-full bg-emerald-50 text-emerald-600">
        <CheckCircle2 size={34} />
      </div>
      <h2 className="mt-4 text-2xl font-semibold text-slate-900">{title ?? t("result.title")}</h2>
      {(filePath || folderPath) && (
        <p className="mt-2 break-all text-sm text-slate-500">
          {t("result.savedTo")}: <span className="font-mono text-slate-700">{filePath ?? folderPath}</span>
        </p>
      )}
      {children && <div className="mt-6 text-left">{children}</div>}
      <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
        {filePath && (
          <Button
            accentBg="bg-emerald-600 hover:bg-emerald-700"
            icon={<ExternalLink size={16} />}
            onClick={() => guard(() => openOutput(filePath))}
          >
            {t("common.openFile")}
          </Button>
        )}
        {(filePath || folderPath) && (
          <Button
            variant="secondary"
            icon={<FolderOpen size={16} />}
            onClick={() =>
              guard(() => (filePath ? revealOutput(filePath) : openOutput(folderPath as string)))
            }
          >
            {t("common.openFolder")}
          </Button>
        )}
        <Button variant="ghost" icon={<RotateCcw size={16} />} onClick={onStartOver}>
          {t("common.startOver")}
        </Button>
      </div>

      {nextActions && nextActions.length > 0 && (
        <div className="mt-8 border-t border-slate-100 pt-6">
          <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-slate-500">{t("handoff.title")}</p>
          <div className="flex flex-wrap justify-center gap-2">
            {nextActions.map((action) => {
              const a = accentClasses(action.accent);
              const Icon = action.icon;
              return (
                <button
                  key={action.id}
                  type="button"
                  onClick={action.onClick}
                  className={`inline-flex items-center gap-2 rounded-lg border ${a.border} ${a.softBg} px-3 py-2 text-sm font-medium ${a.textStrong} transition hover:brightness-95`}
                >
                  <Icon size={16} />
                  {action.label}
                  <ArrowRight size={14} />
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
