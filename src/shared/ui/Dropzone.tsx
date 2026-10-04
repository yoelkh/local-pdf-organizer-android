import { FolderOpen, Loader2, Plus, Upload } from "lucide-react";
import { useT } from "@/shared/i18n/useT";
import { isTouch } from "@/shared/platform";
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
 * Area drop + tombol pilih file.
 * - Desktop: area seret file + tombol pilih manual.
 * - Touch (mobile): seluruh area menjadi tombol ketuk untuk membuka picker file.
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

  const headline = isTouch
    ? primaryAccept === "image"
      ? t("dropzone.tap.image")
      : single
        ? t("dropzone.tap.pdfSingle")
        : t("dropzone.tap.pdf")
    : isDragging
      ? t("dropzone.dropNow")
      : primaryAccept === "image"
        ? t("dropzone.image")
        : single
          ? t("dropzone.pdfSingle")
          : t("dropzone.pdf");

  const subline = isTouch ? t("dropzone.tapHint") : t("dropzone.orClick");
  const formats = accept.map((k) => t(`dropzone.formats.${k}`)).join(" · ");

  if (compact) {
    return (
      <div
        role={isTouch ? "button" : undefined}
        tabIndex={isTouch ? 0 : undefined}
        onClick={isTouch ? onPick : undefined}
        onKeyDown={
          isTouch
            ? (e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  onPick();
                }
              }
            : undefined
        }
        className={[
          "flex items-center justify-between gap-3 rounded-xl border-2 border-dashed px-4 py-3 transition",
          isTouch ? "cursor-pointer active:bg-slate-50" : "",
          isDragging ? `${a.border} ${a.softBg}` : "border-slate-200 bg-white",
        ].join(" ")}
      >
        <div className="flex items-center gap-2 text-sm text-slate-600 min-w-0">
          <Upload size={16} className={isDragging ? a.text : "text-slate-400 shrink-0"} />
          <span className="truncate">{headline}</span>
        </div>
        <Button
          size="sm"
          variant="secondary"
          onClick={(e) => {
            if (isTouch) e.stopPropagation();
            onPick();
          }}
          loading={busy}
          icon={<Plus size={14} />}
          className="shrink-0"
        >
          {t("common.addMore")}
        </Button>
      </div>
    );
  }

  if (isTouch) {
    return (
      <button
        type="button"
        onClick={onPick}
        disabled={busy}
        className={[
          "flex w-full min-h-[300px] sm:min-h-[340px] flex-col items-center justify-center gap-4 rounded-2xl border-2 border-dashed px-4 py-8 sm:px-6 sm:py-12 text-center transition cursor-pointer active:bg-slate-50",
          "focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-slate-400",
          "border-slate-300 bg-white",
        ].join(" ")}
      >
        <div className={`grid h-16 w-16 place-items-center rounded-2xl ${a.softBg} ${a.text}`}>
          <Upload size={30} />
        </div>
        <div>
          <p className="text-lg font-semibold text-slate-800">{headline}</p>
          <p className="mt-1 text-sm text-slate-500 max-w-sm mx-auto">{subline}</p>
        </div>
        <span
          className={`inline-flex items-center justify-center rounded-lg font-medium h-12 px-6 text-base gap-2 text-white shadow-sm ${a.bg} ${a.hoverBg}`}
        >
          {busy ? <Loader2 size={18} className="animate-spin" /> : <FolderOpen size={18} />}
          {t("common.pickFiles")}
        </span>
        <p className="text-xs text-slate-400">{formats}</p>
      </button>
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
        <p className="mt-1 text-sm text-slate-500">{subline}</p>
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
