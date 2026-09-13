import { X } from "lucide-react";
import type { FileInfo } from "@/shared/ipc/types";
import { useT } from "@/shared/i18n/useT";
import { formatBytes } from "@/shared/lib/format";
import { PageThumb } from "./PageThumb";

interface Props {
  file: FileInfo;
  index?: number;
  onRemove?: (id: string) => void;
  isDragging?: boolean;
}

/** Kartu satu file: thumbnail halaman pertama, nama, jumlah halaman, ukuran. */
export function FileCard({ file, index, onRemove, isDragging = false }: Props) {
  const { t } = useT();
  return (
    <div
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
      {onRemove && (
        <button
          type="button"
          onPointerDown={(e) => e.stopPropagation()}
          onClick={() => onRemove(file.id)}
          className="absolute right-2 top-2 z-10 grid h-7 w-7 place-items-center rounded-full bg-white/90 text-slate-500 opacity-0 shadow transition hover:bg-red-50 hover:text-red-600 group-hover:opacity-100"
          aria-label={t("common.remove")}
        >
          <X size={14} />
        </button>
      )}
      <div className="grid h-44 place-items-center bg-slate-50 p-3">
        <PageThumb fileId={file.id} page={0} width={240} className="max-h-full max-w-full shadow" alt={file.name} />
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
