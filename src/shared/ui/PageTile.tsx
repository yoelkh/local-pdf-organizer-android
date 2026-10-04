import { Check, Eye, RotateCw, Trash2 } from "lucide-react";
import { useT } from "@/shared/i18n/useT";
import { accentClasses, sourceTagClass, type Accent } from "@/shared/lib/colors";
import type { BoardPage } from "@/shared/pageboard/usePageBoard";
import { PageThumb } from "./PageThumb";

interface Props {
  page: BoardPage;
  position: number;
  /** Indeks warna file sumber (strip di atas ubin). Abaikan bila `showSourceTag` false. */
  sourceIndex?: number;
  showSourceTag?: boolean;
  /** Keterangan di kaki ubin, mis. "Hal. 3" atau nama file. */
  caption: string;
  accent: Accent;
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
 * Satu ubin di papan halaman: thumbnail (dengan rotasi visual), nomor urut,
 * tag sumber opsional. Klik = pilih, klik ganda / tombol mata = lihat ukuran besar.
 */
export function PageTile({
  page,
  position,
  sourceIndex = 0,
  showSourceTag = true,
  caption,
  accent,
  selected,
  isDragging,
  thumbWidth,
  onToggle,
  onView,
  onRotate,
  onRemove,
}: Props) {
  const { t } = useT();
  const a = accentClasses(accent);
  const stop = (e: React.SyntheticEvent) => e.stopPropagation();
  const sideways = page.rotation % 180 !== 0;

  const action =
    "grid place-items-center rounded-lg text-slate-500 transition " +
    "pointer-coarse:h-9 pointer-coarse:w-9 @max-[100px]:pointer-coarse:hidden pointer-coarse:text-slate-700 active:bg-slate-100 " +
    "pointer-fine:h-7 pointer-fine:w-7 pointer-fine:hover:bg-slate-100 pointer-fine:hover:text-slate-900";

  return (
    <div
      onClick={() => onToggle(page.key)}
      onDoubleClick={() => onView(page.key)}
      className={[
        "group relative flex cursor-grab flex-col overflow-hidden rounded-xl border bg-white shadow-sm transition active:cursor-grabbing motion-reduce:transition-none @container",
        selected ? `${a.borderStrong} ring-2 ${a.ring}` : "border-slate-200 hover:border-slate-300",
        isDragging ? "scale-[1.03] shadow-2xl ring-2 ring-slate-400" : "",
      ].join(" ")}
    >
      {showSourceTag && (
        <span className={`absolute left-0 top-0 z-10 h-1.5 w-full ${sourceTagClass(sourceIndex)}`} />
      )}

      {/* Nomor urut ubin */}
      <span className="absolute z-10 grid place-items-center rounded-full bg-slate-900/80 px-1 font-semibold text-white pointer-coarse:left-1 pointer-coarse:top-1 pointer-coarse:h-5 pointer-coarse:min-w-5 pointer-coarse:text-[10px] @[140px]:pointer-coarse:left-1.5 @[140px]:pointer-coarse:top-1.5 @[140px]:pointer-coarse:h-6 @[140px]:pointer-coarse:min-w-6 @[140px]:pointer-coarse:text-[11px] pointer-fine:left-2 pointer-fine:top-3 pointer-fine:h-6 pointer-fine:min-w-6 pointer-fine:text-xs">
        {position + 1}
      </span>

      {/* Lingkaran penanda centang seleksi */}
      <span
        className={[
          "absolute z-10 grid place-items-center rounded-full border text-white transition",
          // Sentuh: 28px di <100px, 32px di 100-139px, 36px di >=140px
          "pointer-coarse:right-1 pointer-coarse:top-1 pointer-coarse:h-7 pointer-coarse:w-7 @[100px]:pointer-coarse:h-8 @[100px]:pointer-coarse:w-8 @[140px]:pointer-coarse:right-1.5 @[140px]:pointer-coarse:top-1.5 @[140px]:pointer-coarse:h-9 @[140px]:pointer-coarse:w-9",
          // Mouse: 24px di desktop
          "pointer-fine:right-2 pointer-fine:top-3 pointer-fine:h-6 pointer-fine:w-6",
          selected
            ? `${a.borderStrong} ${a.bg} opacity-100`
            : "border-slate-300 bg-white/90 pointer-coarse:opacity-100 pointer-fine:opacity-0 pointer-fine:group-hover:opacity-100",
        ].join(" ")}
      >
        {selected && <Check className="size-3 pointer-coarse:size-3.5 @[140px]:pointer-coarse:size-4.5" />}
      </span>

      <div className="relative aspect-[3/4] bg-slate-50">
        <div
          className="absolute inset-0 flex items-center justify-center p-1.5 @[140px]:p-3 transition-transform duration-200 motion-reduce:transition-none"
          style={{ transform: `rotate(${page.rotation}deg) scale(${sideways ? 0.75 : 1})` }}
        >
          <PageThumb
            fileId={page.fileId}
            page={page.page}
            width={thumbWidth}
            className="max-h-full max-w-full shadow"
            alt={caption}
          />
        </div>

        {/* Tombol mata: pada touch di pojok kanan-bawah (tidak menutupi tengah ubin); pada mouse di tengah saat hover */}
        <button
          type="button"
          onPointerDown={stop}
          onClick={(e) => {
            stop(e);
            onView(page.key);
          }}
          className={[
            "z-10 grid place-items-center rounded-full bg-slate-900/80 text-white shadow-md backdrop-blur transition hover:bg-slate-900 active:bg-slate-950",
            // Sentuh: pojok kanan-bawah thumbnail, 32px di <100px, 36px di 100-139px, 40px di >=140px
            "pointer-coarse:absolute pointer-coarse:bottom-1 pointer-coarse:right-1 pointer-coarse:h-8 pointer-coarse:w-8 @[100px]:pointer-coarse:h-9 @[100px]:pointer-coarse:w-9 @[140px]:pointer-coarse:bottom-1.5 @[140px]:pointer-coarse:right-1.5 @[140px]:pointer-coarse:h-10 @[140px]:pointer-coarse:w-10",
            // Mouse: tengah ubin, 44px, muncul saat hover
            "pointer-fine:absolute pointer-fine:left-1/2 pointer-fine:top-1/2 pointer-fine:-translate-x-1/2 pointer-fine:-translate-y-1/2 pointer-fine:h-11 pointer-fine:w-11 pointer-fine:opacity-0 pointer-fine:group-hover:opacity-100 pointer-fine:focus-visible:opacity-100",
          ].join(" ")}
          aria-label={t("view.open")}
          title={t("view.open")}
        >
          <Eye className="size-3.5 @[100px]:size-4 @[140px]:size-5 pointer-fine:size-5" />
        </button>
      </div>

      {/* Baris bawah ubin: keterangan + aksi putar & hapus */}
      <div className="flex items-center justify-between border-t border-slate-100 px-1 @[140px]:px-2 py-0.5 @[140px]:py-1">
        <span
          className="min-w-0 flex-1 truncate text-[10px] @[140px]:text-xs text-slate-500 @max-[100px]:text-center"
          title={caption}
        >
          {caption}
        </span>
        <div className="flex shrink-0 pointer-coarse:gap-1 @[140px]:pointer-coarse:gap-1.5 pointer-fine:gap-0.5">
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
            <RotateCw className="size-3.5 @[140px]:pointer-coarse:size-4" />
          </button>
          <button
            type="button"
            onPointerDown={stop}
            onClick={(e) => {
              stop(e);
              onRemove(page.key);
            }}
            className={`${action} hover:!bg-red-50 hover:!text-red-600 active:!bg-red-100 active:!text-red-700`}
            aria-label={t("common.remove")}
            title={t("common.remove")}
          >
            <Trash2 className="size-3.5 @[140px]:pointer-coarse:size-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
