import { FolderOpen, Plus, Upload } from "lucide-react";
import { useT } from "@/shared/i18n/useT";
import type { Accept } from "@/shared/files/accept";
import type { Accent } from "@/shared/lib/colors";
import { accentClasses } from "@/shared/lib/colors";
import { Button } from "./Button";

interface Props {
  accept: Accept[];
  single?: boolean;
  isDragging: boolean;
  busy?: boolean;
  onPick: () => void;
  accent?: Accent;
  /** Tampilan ringkas (bar) saat sudah ada file. */
  compact?: boolean;
}

/**
 * Area drop + tombol pilih file. Drop sesungguhnya ditangani oleh
 * `useFileDrop` di level jendela; komponen ini hanya memberi umpan balik visual.
 */
export function Dropzone({
  accept,
  single = false,
  isDragging,
  busy = false,
  onPick,
  accent = "rose",
  compact = false,
}: Props) {
  const { t } = useT();
  const a = accentClasses(accent);
  const primaryAccept = accept[0] ?? "pdf";
  const headline = isDragging
    ? t("dropzone.dropNow")
    : primaryAccept === "image"
      ? t("dropzone.image")
      : single
        ? t("dropzone.pdfSingle")
        : t("dropzone.pdf");
  const formats = accept.map((k) => t(`dropzone.formats.${k}`)).join(" · ");

  if (compact) {
    return (
      <div
        className={[
          "flex items-center justify-between gap-3 rounded-xl border-2 border-dashed px-4 py-3 transition",
          isDragging ? `${a.border} ${a.softBg}` : "border-slate-200 bg-white",
        ].join(" ")}
      >
        <div className="flex items-center gap-2 text-sm text-slate-600">
          <Upload size={16} className={isDragging ? a.text : "text-slate-400"} />
          <span>{headline}</span>
        </div>
        <Button
          size="sm"
          variant="secondary"
          onClick={onPick}
          loading={busy}
          icon={<Plus size={14} />}
        >
          {t("common.addMore")}
        </Button>
      </div>
    );
  }

  return (
    <div
      className={[
        "flex min-h-[340px] flex-col items-center justify-center gap-4 rounded-2xl border-2 border-dashed px-6 py-12 text-center transition",
        isDragging ? `${a.border} ${a.softBg} scale-[1.01]` : "border-slate-300 bg-white",
      ].join(" ")}
    >
      <div className={`grid h-16 w-16 place-items-center rounded-2xl ${a.softBg} ${a.text}`}>
        <Upload size={30} />
      </div>
      <div>
        <p className="text-lg font-semibold text-slate-800">{headline}</p>
        <p className="mt-1 text-sm text-slate-500">{t("dropzone.orClick")}</p>
      </div>
      <Button
        size="lg"
        onClick={onPick}
        loading={busy}
        accentBg={`${a.bg} ${a.hoverBg}`}
        icon={<FolderOpen size={18} />}
      >
        {t("common.pickFiles")}
      </Button>
      <p className="text-xs text-slate-400">{formats}</p>
    </div>
  );
}
