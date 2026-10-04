import { useCallback, useState, type CSSProperties } from "react";
import { useIsCompact } from "@/shared/platform";

export const THUMB_MIN = 130;
export const THUMB_MAX = 460;
export const THUMB_STEP = 10;

const STORAGE_PREFIX = "thumbSize:";
const COMPACT_STORAGE_PREFIX = "thumbCols:";

export interface ThumbSize {
  /** Lebar ubin dalam piksel (desktop) atau jumlah kolom (compact). */
  size: number;
  setSize: (size: number) => void;
  /** Style grid: kolom otomatis (desktop) atau repeat(n, minmax(0, 1fr)) (compact). */
  gridStyle: CSSProperties;
  /** Lebar render yang diminta ke backend (dibulatkan ke beberapa tingkat agar cache efektif). */
  renderWidth: number;
  /** Jumlah kolom aktif (1..4 di compact). */
  columns: number;
  /** Ubah jumlah kolom (khusus compact). */
  setColumns: (cols: number) => void;
  isCompact: boolean;
}

function clamp(n: number): number {
  return Math.min(THUMB_MAX, Math.max(THUMB_MIN, Math.round(n)));
}

function clampCols(n: number): number {
  return Math.min(4, Math.max(1, Math.round(n)));
}

/** Resolusi render backend untuk mobile berdasarkan jumlah kolom (lebar ~360-430px × DPR 2-3). */
function compactRenderWidth(cols: number): number {
  switch (cols) {
    case 1:
      return 720;
    case 2:
      return 400;
    case 3:
      return 260;
    case 4:
    default:
      return 200;
  }
}

/** Tingkat resolusi render desktop; ×~1.5 dari ukuran tampil supaya tetap tajam. */
function desktopRenderWidth(size: number): number {
  if (size <= 170) return 260;
  if (size <= 260) return 400;
  if (size <= 360) return 560;
  return 720;
}

/** Ukuran thumbnail per alat, tersimpan di localStorage dengan kunci `storageKey`. */
export function useThumbSize(storageKey: string, defaultSize = 200): ThumbSize {
  const isCompact = useIsCompact();

  // State ukuran desktop (pixel)
  const [desktopSize, setDesktopSize] = useState<number>(() => {
    try {
      const raw = Number(localStorage.getItem(STORAGE_PREFIX + storageKey));
      return Number.isFinite(raw) && raw > 0 ? clamp(raw) : clamp(defaultSize);
    } catch {
      return clamp(defaultSize);
    }
  });

  // State kolom compact (1..4, default: 2)
  const [compactCols, setCompactCols] = useState<number>(() => {
    try {
      const raw = Number(localStorage.getItem(COMPACT_STORAGE_PREFIX + storageKey));
      return Number.isFinite(raw) && raw >= 1 && raw <= 4 ? clampCols(raw) : 2;
    } catch {
      return 2;
    }
  });

  const setSize = useCallback(
    (next: number) => {
      if (isCompact) {
        const cols = clampCols(next);
        setCompactCols(cols);
        try {
          localStorage.setItem(COMPACT_STORAGE_PREFIX + storageKey, String(cols));
        } catch {
          /* penyimpanan tidak tersedia; abaikan */
        }
      } else {
        const val = clamp(next);
        setDesktopSize(val);
        try {
          localStorage.setItem(STORAGE_PREFIX + storageKey, String(val));
        } catch {
          /* penyimpanan tidak tersedia; abaikan */
        }
      }
    },
    [isCompact, storageKey],
  );

  const setColumns = useCallback(
    (nextCols: number) => {
      const cols = clampCols(nextCols);
      setCompactCols(cols);
      try {
        localStorage.setItem(COMPACT_STORAGE_PREFIX + storageKey, String(cols));
      } catch {
        /* penyimpanan tidak tersedia; abaikan */
      }
    },
    [storageKey],
  );

  if (isCompact) {
    return {
      size: compactCols,
      setSize,
      gridStyle: { gridTemplateColumns: `repeat(${compactCols}, minmax(0, 1fr))` },
      renderWidth: compactRenderWidth(compactCols),
      columns: compactCols,
      setColumns,
      isCompact: true,
    };
  }

  return {
    size: desktopSize,
    setSize,
    gridStyle: { gridTemplateColumns: `repeat(auto-fill, minmax(${desktopSize}px, 1fr))` },
    renderWidth: desktopRenderWidth(desktopSize),
    columns: Math.max(1, Math.round(1024 / desktopSize)),
    setColumns,
    isCompact: false,
  };
}
