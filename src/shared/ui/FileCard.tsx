import { Eye, RotateCw, X } from "lucide-react";
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
  /** Putar seluruh file (tampilan visual mengikuti `rotation`). */
  onRotate?: (id: string) => void;
  rotation?: number;
  isDragging?: boolean;
  /** Lebar render thumbnail di backend (piksel). */
  thumbWidth?: number;
}

/** Kartu satu file: thumbnail halaman pertama, nama, jumlah halaman, ukuran. */
export function FileCard({ file, index, onRemove, onView, onRotate, rotation = 0, isDragging = false, thumbWidth = 260 }: Props) {
  const { t } = useT();
  const stop = (e: React.SyntheticEvent) => e.stopPropagation();
  const sideways = rotation % 180 !== 0;

  return (
    <div
      onDoubleClick={() => onView?.(file.id)}
      className={[
        "group relative flex cursor-grab flex-col overflow-hidden rounded-xl border bg-white shadow-sm transition active:cursor-grabbing motion-reduce:transition-none @container",
        isDragging
          ? "border-slate-400 shadow-2xl scale-[1.03]"
          : "border-slate-200 hover:border-slate-300 hover:shadow",
      ].join(" ")}
    >
      {typeof index === "number" && (
        <span className="absolute z-10 grid place-items-center rounded-full bg-slate-900/80 px-1 font-semibold text-white pointer-coarse:left-1 pointer-coarse:top-1 pointer-coarse:h-5 pointer-coarse:min-w-5 pointer-coarse:text-[10px] @[140px]:pointer-coarse:left-1.5 @[140px]:pointer-coarse:top-1.5 @[140px]:pointer-coarse:h-6 @[140px]:pointer-coarse:min-w-6 @[140px]:pointer-coarse:text-[11px] pointer-fine:left-2 pointer-fine:top-2 pointer-fine:h-6 pointer-fine:min-w-6 pointer-fine:text-xs">
          {index + 1}
        </span>
      )}

      {/* Desktop: kumpulan tombol hover di pojok kanan-atas */}
      <div className="absolute right-2 top-2 z-10 hidden items-center gap-1 opacity-0 transition pointer-fine:flex pointer-fine:group-hover:opacity-100 pointer-fine:group-focus-within:opacity-100">
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
        {onRotate && (
          <button
            type="button"
            onPointerDown={stop}
            onClick={(e) => {
              stop(e);
              onRotate(file.id);
            }}
            className="grid h-7 w-7 place-items-center rounded-full bg-white/95 text-slate-600 shadow hover:bg-slate-900 hover:text-white"
            aria-label={t("common.rotate")}
            title={t("common.rotate")}
          >
            <RotateCw size={14} />
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

      {/* Sentuh: tombol hapus di pojok kanan-atas (disembunyikan di <100px pada sentuh) */}
      {onRemove && (
        <button
          type="button"
          onPointerDown={stop}
          onClick={(e) => {
            stop(e);
            onRemove(file.id);
          }}
          className="z-10 place-items-center rounded-full bg-white/95 text-slate-500 shadow active:bg-red-50 active:text-red-600 pointer-coarse:absolute pointer-coarse:right-1 pointer-coarse:top-1 pointer-coarse:grid pointer-coarse:h-9 pointer-coarse:w-9 @[140px]:pointer-coarse:right-1.5 @[140px]:pointer-coarse:top-1.5 @[140px]:pointer-coarse:h-10 @[140px]:pointer-coarse:w-10 @max-[100px]:pointer-coarse:hidden pointer-fine:hidden"
          aria-label={t("common.remove")}
          title={t("common.remove")}
        >
          <X className="size-3.5 @[140px]:size-4" />
        </button>
      )}

      <div className="relative aspect-[3/4] bg-slate-50">
        <div
          className="absolute inset-0 flex items-center justify-center p-1.5 @[140px]:p-3 transition-transform duration-200 motion-reduce:transition-none"
          style={{ transform: `rotate(${rotation}deg) scale(${sideways ? 0.75 : 1})` }}
        >
          <PageThumb
            fileId={file.id}
            page={0}
            width={thumbWidth}
            className="max-h-full max-w-full shadow"
            alt={file.name}
          />
        </div>

        {/* Sentuh: tombol putar di pojok kiri-bawah thumbnail (disembunyikan di <100px pada sentuh) */}
        {onRotate && (
          <button
            type="button"
            onPointerDown={stop}
            onClick={(e) => {
              stop(e);
              onRotate(file.id);
            }}
            className="z-10 place-items-center rounded-full bg-white/95 text-slate-700 shadow-md active:bg-slate-100 pointer-coarse:absolute pointer-coarse:bottom-1 pointer-coarse:left-1 pointer-coarse:grid pointer-coarse:h-9 pointer-coarse:w-9 @[140px]:pointer-coarse:bottom-1.5 @[140px]:pointer-coarse:left-1.5 @[140px]:pointer-coarse:h-10 @[140px]:pointer-coarse:w-10 @max-[100px]:pointer-coarse:hidden pointer-fine:hidden"
            aria-label={t("common.rotate")}
            title={t("common.rotate")}
          >
            <RotateCw className="size-3.5 @[140px]:size-4" />
          </button>
        )}

        {/* Sentuh: tombol mata di pojok kanan-bawah thumbnail (tengah ubin tetap bersih) */}
        {onView && (
          <button
            type="button"
            onPointerDown={stop}
            onClick={(e) => {
              stop(e);
              onView(file.id);
            }}
            className="z-10 place-items-center rounded-full bg-slate-900/80 text-white shadow-md backdrop-blur active:bg-slate-950 pointer-coarse:absolute pointer-coarse:bottom-1 pointer-coarse:right-1 pointer-coarse:grid pointer-coarse:h-8 pointer-coarse:w-8 @[100px]:pointer-coarse:h-9 @[100px]:pointer-coarse:w-9 @[140px]:pointer-coarse:bottom-1.5 @[140px]:pointer-coarse:right-1.5 @[140px]:pointer-coarse:h-10 @[140px]:pointer-coarse:w-10 pointer-fine:hidden"
            aria-label={t("view.open")}
            title={t("view.open")}
          >
            <Eye className="size-3.5 @[100px]:size-4 @[140px]:size-5" />
          </button>
        )}
      </div>

      <div className="border-t border-slate-100 px-1.5 py-1 @[140px]:px-3 @[140px]:py-2">
        <p className="truncate text-[10px] @[140px]:text-xs font-medium text-slate-800" title={file.path}>
          {file.name}
        </p>
        <p className="truncate text-[9px] @[140px]:text-xs text-slate-500 @max-[100px]:hidden">
          {file.kind === "pdf" ? t("common.pages", { n: file.pages }) : `${file.width}×${file.height}`}
          {" · "}
          {formatBytes(file.size)}
        </p>
      </div>
    </div>
  );
}
