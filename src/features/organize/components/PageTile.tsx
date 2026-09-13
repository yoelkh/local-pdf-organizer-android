import { Check, RotateCw, Trash2 } from "lucide-react";
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
  onToggle: (key: string) => void;
  onRotate: (key: string) => void;
  onRemove: (key: string) => void;
}

/** Satu ubin halaman: thumbnail (dengan rotasi visual), nomor urut, tag sumber, aksi hover. */
export function PageTile({
  page,
  position,
  sourceIndex,
  selected,
  isDragging,
  onToggle,
  onRotate,
  onRemove,
}: Props) {
  const { t } = useT();
  const stop = (e: React.SyntheticEvent) => e.stopPropagation();

  return (
    <div
      onClick={() => onToggle(page.key)}
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

      <div className="grid aspect-[3/4] place-items-center bg-slate-50 p-3">
        <div
          className="grid h-full w-full place-items-center transition-transform duration-200"
          style={{ transform: `rotate(${page.rotation}deg)` }}
        >
          <PageThumb
            fileId={page.fileId}
            page={page.page}
            width={200}
            className="max-h-full max-w-full shadow"
            alt={t("common.page", { n: page.page + 1 })}
          />
        </div>
      </div>

      <div className="flex items-center justify-between border-t border-slate-100 px-2 py-1.5">
        <span className="text-xs text-slate-500">{t("common.page", { n: page.page + 1 })}</span>
        <div className="flex gap-1 opacity-0 transition group-hover:opacity-100">
          <button
            type="button"
            onPointerDown={stop}
            onClick={(e) => {
              stop(e);
              onRotate(page.key);
            }}
            className="rounded p-1 text-slate-500 hover:bg-slate-100 hover:text-slate-800"
            aria-label={t("common.rotate")}
            title={t("common.rotate")}
          >
            <RotateCw size={14} />
          </button>
          <button
            type="button"
            onPointerDown={stop}
            onClick={(e) => {
              stop(e);
              onRemove(page.key);
            }}
            className="rounded p-1 text-slate-500 hover:bg-red-50 hover:text-red-600"
            aria-label={t("common.remove")}
            title={t("common.remove")}
          >
            <Trash2 size={14} />
          </button>
        </div>
      </div>
    </div>
  );
}
