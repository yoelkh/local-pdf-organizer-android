import { Grid2x2, Grid3x3 } from "lucide-react";
import { useT } from "@/shared/i18n/useT";
import { THUMB_MAX, THUMB_MIN, THUMB_STEP, type ThumbSize } from "./useThumbSize";

/** Pengatur ukuran thumbnail: segmented control (1-4 kolom) pada layar ponsel/kompak, slider pada desktop. */
export function ThumbSizeControl({ value }: { value: ThumbSize }) {
  const { t } = useT();

  if (value.isCompact) {
    const cols = value.columns;
    return (
      <div className="flex items-center gap-1.5 text-slate-500 shrink-0" title={t("view.thumbSize")}>
        <div
          className="inline-flex rounded-lg bg-slate-100 p-0.5"
          role="group"
          aria-label={t("view.thumbSize")}
        >
          {[1, 2, 3, 4].map((n) => {
            const active = cols === n;
            return (
              <button
                key={n}
                type="button"
                onClick={() => value.setColumns(n)}
                aria-pressed={active}
                className={[
                  "grid h-8 w-8 place-items-center rounded-md text-xs font-semibold transition active:scale-95",
                  active
                    ? "bg-white text-slate-900 shadow-sm"
                    : "text-slate-500 hover:text-slate-900 active:bg-slate-200/60",
                ].join(" ")}
                title={`${n} ${n === 1 ? "kolom" : "kolom"}`}
                aria-label={`${n} kolom`}
              >
                {n}
              </button>
            );
          })}
        </div>
      </div>
    );
  }

  // Desktop slider: perilaku asli desktop tetap utuh
  return (
    <div className="flex items-center gap-2 text-slate-500" title={t("view.thumbSize")}>
      <button
        type="button"
        onClick={() => value.setSize(value.size - 60)}
        className="rounded p-1 hover:bg-slate-100 hover:text-slate-800"
        aria-label={t("view.smaller")}
      >
        <Grid3x3 size={16} />
      </button>
      <input
        type="range"
        min={THUMB_MIN}
        max={THUMB_MAX}
        step={THUMB_STEP}
        value={value.size}
        onChange={(e) => value.setSize(Number(e.target.value))}
        aria-label={t("view.thumbSize")}
        className="h-1.5 w-32 cursor-pointer accent-slate-700"
      />
      <button
        type="button"
        onClick={() => value.setSize(value.size + 60)}
        className="rounded p-1 hover:bg-slate-100 hover:text-slate-800"
        aria-label={t("view.larger")}
      >
        <Grid2x2 size={18} />
      </button>
    </div>
  );
}
