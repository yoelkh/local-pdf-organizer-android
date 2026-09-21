import { Check, Eye, RotateCw, Trash2 } from "lucide-react";
import { useT } from "@/shared/i18n/useT";
import { sourceTagClass } from "@/shared/lib/colors";
import { PageThumb } from "@/shared/ui/PageThumb";
import type { BoardPage } from "../hooks/usePageBoard";

interface Props {
  page: BoardPage;
  position: number;
  sourceIndex: number;
  selected: boolean;
  isDragging: boolean;
  /** Lebar render thumbnail di backend (piksel). */
  thumbWidth: number;
  onToggle: (key: string) => void;
  onView: (key: string) => void;
  onRotate: (key: string) => void;
  onRemove: (key: string) => void;
}

/**
 * Satu ubin halaman: thumbnail (dengan rotasi visual), nomor urut, tag sumber.
 * Klik = pilih, klik ganda / tombol mata = lihat ukuran besar.
 */
export function PageTile({
  page,
  position,
  sourceIndex,
  selected,
  isDragging,
  thumbWidth,
  onToggle,
  onView,
  onRotate,
  onRemove,
}: Props) {
  const { t } = useT();
  const stop = (e: React.SyntheticEvent) => e.stopPropagation();
  const sideways = page.rotation % 180 !== 0;

  const action =
    "grid h-7 w-7 place-items-center rounded-md text-slate-500 transition hover:bg-slate-100 hover:text-slate-900";

  return (
    <div
      onClick={() => onToggle(page.key)}
      onDoubleClick={() => onView(page.key)}
      className={[
        "group relative flex cursor-grab flex-col overflow-hidden rounded-xl border bg-white shadow-sm transition active:cursor-grabbing",
        selected ? "border-violet-500 ring-2 ring-violet-300" : "border-slate-200 hover:border-slate-300",
        isDragging ? "shadow-xl" : "",
      ].join(" ")}
    >
      <span className={`absolute left-0 top-0 z-10 h-1.5 w-full ${sourceTagClass(sourceIndex)}`} />

      <span className="absolute left-2 top-3 z-10 grid h-6 min-w-6 place-items-center rounded-full bg-slate-900/80 px-1.5 text-xs font-semibold text-white">
        {position + 1}
      </span>

      <span
        className={[
          "absolute right-2 top-3 z-10 grid h-6 w-6 place-items-center rounded-full border text-white transition",
          selected ? "border-violet-500 bg-violet-500" : "border-slate-300 bg-white/90 opacity-0 group-hover:opacity-100",
        ].join(" ")}
      >
        {selected && <Check size={14} />}
      </span>

      <div className="relative aspect-[3/4] bg-slate-50">
        <div
          className="absolute inset-0 flex items-center justify-center p-3 transition-transform duration-200"
          style={{ transform: `rotate(${page.rotation}deg) scale(${sideways ? 0.75 : 1})` }}
        >
          <PageThumb
            fileId={page.fileId}
            page={page.page}
            width={thumbWidth}
            className="max-h-full max-w-full shadow"
            alt={t("common.page", { n: page.page + 1 })}
          />
        </div>

        {/* Tombol lihat besar di tengah saat hover */}
        <button
          type="button"
          onPointerDown={stop}
          onClick={(e) => {
            stop(e);
            onView(page.key);
          }}
          className="absolute left-1/2 top-1/2 z-10 grid h-11 w-11 -translate-x-1/2 -translate-y-1/2 place-items-center rounded-full bg-slate-900/75 text-white opacity-0 shadow-lg backdrop-blur transition hover:bg-slate-900 group-hover:opacity-100 focus-visible:opacity-100"
          aria-label={t("view.open")}
          title={t("view.open")}
        >
          <Eye size={20} />
        </button>
      </div>

      <div className="flex items-center justify-between gap-1 border-t border-slate-100 px-2 py-1">
        <span className="truncate text-xs text-slate-500">{t("common.page", { n: page.page + 1 })}</span>
        <div className="flex shrink-0">
          <button
            type="button"
            onPointerDown={stop}
            onClick={(e) => {
              stop(e);
              onRotate(page.key);
            }}
            className={action}
            aria-label={t("common.rotate")}
            title={t("common.rotate")}
          >
            <RotateCw size={15} />
          </button>
          <button
            type="button"
            onPointerDown={stop}
            onClick={(e) => {
              stop(e);
              onRemove(page.key);
            }}
            className={`${action} hover:!bg-red-50 hover:!text-red-600`}
            aria-label={t("common.remove")}
            title={t("common.remove")}
          >
            <Trash2 size={15} />
          </button>
        </div>
      </div>
    </div>
  );
}
