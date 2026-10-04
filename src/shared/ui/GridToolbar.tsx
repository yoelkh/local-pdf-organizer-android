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
    <div className="flex flex-wrap items-center justify-between gap-2 sm:gap-3">
      <div className="min-w-0 flex-1 basis-full sm:basis-auto text-xs text-slate-500">
        {children}
      </div>
      <div className="ml-auto sm:ml-0 shrink-0">
        <ThumbSizeControl value={thumbSize} />
      </div>
    </div>
  );
}
