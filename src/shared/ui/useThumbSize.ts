import { useCallback, useState, type CSSProperties } from "react";

export const THUMB_MIN = 130;
export const THUMB_MAX = 460;
export const THUMB_STEP = 10;
const STORAGE_PREFIX = "thumbSize:";

export interface ThumbSize {
  /** Lebar minimum ubin dalam piksel. */
  size: number;
  setSize: (size: number) => void;
  /** Style grid: kolom otomatis mengikuti ukuran ubin. */
  gridStyle: CSSProperties;
  /** Lebar render yang diminta ke backend (dibulatkan ke beberapa tingkat agar cache efektif). */
  renderWidth: number;
}

function clamp(n: number): number {
  return Math.min(THUMB_MAX, Math.max(THUMB_MIN, Math.round(n)));
}

/** Tingkat resolusi render; ×~1.5 dari ukuran tampil supaya tetap tajam. */
function renderWidthFor(size: number): number {
  if (size <= 170) return 260;
  if (size <= 260) return 400;
  if (size <= 360) return 560;
  return 720;
}

/** Ukuran thumbnail per alat, tersimpan di localStorage dengan kunci `storageKey`. */
export function useThumbSize(storageKey: string, defaultSize = 200): ThumbSize {
  const [size, setSizeState] = useState<number>(() => {
    try {
      const raw = Number(localStorage.getItem(STORAGE_PREFIX + storageKey));
      return Number.isFinite(raw) && raw > 0 ? clamp(raw) : clamp(defaultSize);
    } catch {
      return clamp(defaultSize);
    }
  });

  const setSize = useCallback(
    (next: number) => {
      const value = clamp(next);
      setSizeState(value);
      try {
        localStorage.setItem(STORAGE_PREFIX + storageKey, String(value));
      } catch {
        /* penyimpanan tidak tersedia; abaikan */
      }
    },
    [storageKey],
  );

  return {
    size,
    setSize,
    gridStyle: { gridTemplateColumns: `repeat(auto-fill, minmax(${size}px, 1fr))` },
    renderWidth: renderWidthFor(size),
  };
}
