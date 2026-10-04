import { useEffect, useState } from "react";

/**
 * Satu-satunya tempat frontend bertanya "sedang jalan di mana?".
 * - `isAndroid` / `isMobile`: platform (penanganan file berbeda: content URI, simpan/bagikan).
 * - `isTouch`: perangkat sentuh (tidak ada hover, seret butuh tekan lama).
 * - `useIsCompact()`: lebar layar di bawah breakpoint `lg` (tata letak satu kolom).
 */
const ua = typeof navigator === "undefined" ? "" : navigator.userAgent;

export const isAndroid = /Android/i.test(ua);
export const isMobile = isAndroid;

export const isTouch =
  typeof window !== "undefined" && typeof window.matchMedia === "function"
    ? window.matchMedia("(pointer: coarse)").matches
    : false;

/** Sama dengan breakpoint `lg` Tailwind (1024px). */
const COMPACT_QUERY = "(max-width: 1023.98px)";

export function useIsCompact(): boolean {
  const [compact, setCompact] = useState(() =>
    typeof window !== "undefined" && typeof window.matchMedia === "function"
      ? window.matchMedia(COMPACT_QUERY).matches
      : false,
  );

  useEffect(() => {
    const mq = window.matchMedia(COMPACT_QUERY);
    const onChange = () => setCompact(mq.matches);
    onChange();
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);

  return compact;
}
