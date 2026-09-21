import type { ReactNode } from "react";
import { ThumbSizeControl } from "./ThumbSizeControl";
import type { ThumbSize } from "./useThumbSize";

interface Props {
  thumbSize: ThumbSize;
  /** Teks/petunjuk di sisi kiri. */
  children?: ReactNode;
}

/** Baris di atas grid: petunjuk di kiri, pengatur ukuran thumbnail di kanan. */
export function GridToolbar({ thumbSize, children }: Props) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3">
      <p className="min-w-0 text-xs text-slate-500">{children}</p>
      <ThumbSizeControl value={thumbSize} />
    </div>
  );
}
