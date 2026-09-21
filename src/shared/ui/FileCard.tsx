import { Eye, X } from "lucide-react";
import type { FileInfo } from "@/shared/ipc/types";
import { useT } from "@/shared/i18n/useT";
import { formatBytes } from "@/shared/lib/format";
import { PageThumb } from "./PageThumb";

interface Props {
  file: FileInfo;
  index?: number;
  onRemove?: (id: string) => void;
  /** Buka penampil halaman besar (tombol mata + klik ganda). */
  onView?: (id: string) => void;
  isDragging?: boolean;
  /** Lebar render thumbnail di backend (piksel). */
  thumbWidth?: number;
}

/** Kartu satu file: thumbnail halaman pertama, nama, jumlah halaman, ukuran. */
export function FileCard({ file, index, onRemove, onView, isDragging = false, thumbWidth = 260 }: Props) {
  const { t } = useT();
  const stop = (e: React.SyntheticEvent) => e.stopPropagation();

  return (
    <div
      onDoubleClick={() => onView?.(file.id)}
      className={[
        "group relative flex cursor-grab flex-col overflow-hidden rounded-xl border bg-white shadow-sm transition active:cursor-grabbing",
        isDragging ? "border-slate-400 shadow-lg" : "border-slate-200 hover:border-slate-300 hover:shadow",
      ].join(" ")}
    >
      {typeof index === "number" && (
        <span className="absolute left-2 top-2 z-10 grid h-6 min-w-6 place-items-center rounded-full bg-slate-900/80 px-1.5 text-xs font-semibold text-white">
          {index + 1}
        </span>
      )}

      <div className="absolute right-2 top-2 z-10 flex gap-1 opacity-0 transition group-hover:opacity-100 group-focus-within:opacity-100">
        {onView && (
          <button
            type="button"
            onPointerDown={stop}
            onClick={(e) => {
              stop(e);
              onView(file.id);
            }}
            className="grid h-7 w-7 place-items-center rounded-full bg-white/95 text-slate-600 shadow hover:bg-slate-900 hover:text-white"
            aria-label={t("view.open")}
            title={t("view.open")}
          >
            <Eye size={14} />
          </button>
        )}
        {onRemove && (
          <button
            type="button"
            onPointerDown={stop}
            onClick={(e) => {
              stop(e);
              onRemove(file.id);
            }}
            className="grid h-7 w-7 place-items-center rounded-full bg-white/95 text-slate-500 shadow hover:bg-red-50 hover:text-red-600"
            aria-label={t("common.remove")}
            title={t("common.remove")}
          >
            <X size={14} />
          </button>
        )}
      </div>

      <div className="relative aspect-[3/4] bg-slate-50">
        <div className="absolute inset-0 flex items-center justify-center p-3">
          <PageThumb
            fileId={file.id}
            page={0}
            width={thumbWidth}
            className="max-h-full max-w-full shadow"
            alt={file.name}
          />
        </div>
      </div>
      <div className="border-t border-slate-100 px-3 py-2">
        <p className="truncate text-sm font-medium text-slate-800" title={file.path}>
          {file.name}
        </p>
        <p className="text-xs text-slate-500">
          {file.kind === "pdf" ? t("common.pages", { n: file.pages }) : `${file.width}×${file.height}`}
          {" · "}
          {formatBytes(file.size)}
        </p>
      </div>
    </div>
  );
}
