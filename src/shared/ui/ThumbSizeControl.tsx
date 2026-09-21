import { Grid2x2, Grid3x3 } from "lucide-react";
import { useT } from "@/shared/i18n/useT";
import { THUMB_MAX, THUMB_MIN, THUMB_STEP, type ThumbSize } from "./useThumbSize";

/** Slider ukuran thumbnail (kecil ⟷ besar). */
export function ThumbSizeControl({ value }: { value: ThumbSize }) {
  const { t } = useT();
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
