import { useCallback, useEffect, useLayoutEffect, useRef, useState, type ReactNode } from "react";
import { ChevronLeft, ChevronRight, Loader2, Maximize, RotateCw, Trash2, X, ZoomIn, ZoomOut } from "lucide-react";
import { thumbnailUrl } from "@/shared/files/thumbnails";
import { useT } from "@/shared/i18n/useT";

/** Satu halaman yang bisa ditampilkan penampil. */
export interface ViewerItem {
  /** Kunci unik (dipakai pemanggil untuk aksi putar/hapus). */
  key: string;
  fileId: string;
  /** Indeks halaman 0-based di file sumber. */
  page: number;
  /** Rotasi tambahan (0/90/180/270) yang ditampilkan secara visual. */
  rotation?: number;
  /** Judul utama, mis. nama file. */
  title: string;
  /** Keterangan kecil, mis. "Hal. 3". */
  subtitle?: string;
}

interface Props {
  items: ViewerItem[];
  index: number;
  onIndexChange: (index: number) => void;
  onClose: () => void;
  /** Bila diisi, tombol putar muncul. */
  onRotate?: (item: ViewerItem) => void;
  /** Bila diisi, tombol hapus muncul. */
  onRemove?: (item: ViewerItem) => void;
  /** Tombol tambahan di bilah atas. */
  extraActions?: ReactNode;
}

/** Lebar render di backend untuk tampilan besar. */
const VIEW_WIDTH = 1600;
const ZOOM_STEPS = [1, 1.5, 2, 3, 4];

/**
 * Penampil halaman layar penuh: navigasi antar halaman, zoom, dan (opsional)
 * putar/hapus. Keyboard: ← → pindah, + − zoom, 0 pas layar, R putar, Del hapus, Esc tutup.
 */
export function PageViewer({ items, index, onIndexChange, onClose, onRotate, onRemove, extraActions }: Props) {
  const { t } = useT();
  const item = items[index];
  const total = items.length;

  const stageRef = useRef<HTMLDivElement>(null);
  const [stage, setStage] = useState({ w: 0, h: 0 });
  const [src, setSrc] = useState<string | null>(null);
  const [natural, setNatural] = useState<{ w: number; h: number } | null>(null);
  const [failed, setFailed] = useState(false);
  const [zoom, setZoom] = useState(1);

  // Tutup otomatis bila daftar menjadi kosong / indeks tidak valid.
  useEffect(() => {
    if (!item) onClose();
  }, [item, onClose]);

  // Ukuran area tampil.
  useLayoutEffect(() => {
    const el = stageRef.current;
    if (!el) return;
    const measure = () => setStage({ w: el.clientWidth, h: el.clientHeight });
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  // Muat gambar halaman aktif.
  const fileId = item?.fileId;
  const page = item?.page;
  useEffect(() => {
    if (fileId === undefined || page === undefined) return;
    let alive = true;
    setSrc(null);
    setNatural(null);
    setFailed(false);
    setZoom(1);
    thumbnailUrl(fileId, page, VIEW_WIDTH)
      .then((url) => alive && setSrc(url))
      .catch(() => alive && setFailed(true));
    return () => {
      alive = false;
    };
  }, [fileId, page]);

  // Pramuat halaman tetangga agar perpindahan terasa instan.
  useEffect(() => {
    for (const neighbor of [items[index + 1], items[index - 1]]) {
      if (neighbor) void thumbnailUrl(neighbor.fileId, neighbor.page, VIEW_WIDTH).catch(() => undefined);
    }
  }, [items, index]);

  const go = useCallback(
    (delta: number) => {
      const next = index + delta;
      if (next >= 0 && next < total) onIndexChange(next);
    },
    [index, total, onIndexChange],
  );

  const zoomBy = useCallback((direction: 1 | -1) => {
    setZoom((z) => {
      const i = ZOOM_STEPS.indexOf(z);
      const next = Math.min(ZOOM_STEPS.length - 1, Math.max(0, (i < 0 ? 0 : i) + direction));
      return ZOOM_STEPS[next];
    });
  }, []);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (!item) return;
      switch (e.key) {
        case "Escape":
          onClose();
          break;
        case "ArrowLeft":
        case "PageUp":
          go(-1);
          break;
        case "ArrowRight":
        case "PageDown":
          go(1);
          break;
        case "Home":
          onIndexChange(0);
          break;
        case "End":
          onIndexChange(total - 1);
          break;
        case "+":
        case "=":
          zoomBy(1);
          break;
        case "-":
          zoomBy(-1);
          break;
        case "0":
          setZoom(1);
          break;
        case "r":
        case "R":
          onRotate?.(item);
          break;
        case "Delete":
          onRemove?.(item);
          break;
        default:
          return;
      }
      e.preventDefault();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [item, total, go, zoomBy, onClose, onIndexChange, onRotate, onRemove]);

  if (!item) return null;

  // Hitung ukuran tampil: kotak pembungkus memakai dimensi setelah rotasi,
  // sehingga scroll tetap benar saat halaman diputar dan di-zoom.
  const rotation = ((item.rotation ?? 0) % 360 + 360) % 360;
  const swapped = rotation % 180 !== 0;
  let box: { bw: number; bh: number; iw: number; ih: number } | null = null;
  if (natural && stage.w > 0 && stage.h > 0) {
    const pad = 32;
    const bw0 = swapped ? natural.h : natural.w;
    const bh0 = swapped ? natural.w : natural.h;
    const fit = Math.min((stage.w - pad) / bw0, (stage.h - pad) / bh0);
    const s = Math.max(0.01, fit) * zoom;
    box = { bw: bw0 * s, bh: bh0 * s, iw: natural.w * s, ih: natural.h * s };
  }

  const iconBtn =
    "grid h-9 w-9 place-items-center rounded-lg text-slate-200 transition hover:bg-white/15 disabled:opacity-30 disabled:hover:bg-transparent";

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-slate-950/90 backdrop-blur-sm" role="dialog" aria-modal="true">
      {/* Bilah atas */}
      <div className="flex h-14 shrink-0 items-center gap-3 border-b border-white/10 px-4 text-slate-100">
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium" title={item.title}>
            {item.title}
          </p>
          <p className="text-xs text-slate-400">
            {item.subtitle ? `${item.subtitle} · ` : ""}
            {t("viewer.position", { n: index + 1, total })}
          </p>
        </div>

        <div className="flex items-center gap-1">
          <button type="button" className={iconBtn} onClick={() => zoomBy(-1)} disabled={zoom <= ZOOM_STEPS[0]} title={t("viewer.zoomOut")} aria-label={t("viewer.zoomOut")}>
            <ZoomOut size={18} />
          </button>
          <span className="w-12 text-center text-xs tabular-nums text-slate-300">{Math.round(zoom * 100)}%</span>
          <button type="button" className={iconBtn} onClick={() => zoomBy(1)} disabled={zoom >= ZOOM_STEPS[ZOOM_STEPS.length - 1]} title={t("viewer.zoomIn")} aria-label={t("viewer.zoomIn")}>
            <ZoomIn size={18} />
          </button>
          <button type="button" className={iconBtn} onClick={() => setZoom(1)} disabled={zoom === 1} title={t("viewer.fit")} aria-label={t("viewer.fit")}>
            <Maximize size={18} />
          </button>

          {(onRotate || onRemove || extraActions) && <span className="mx-1 h-6 w-px bg-white/15" />}
          {onRotate && (
            <button type="button" className={iconBtn} onClick={() => onRotate(item)} title={t("common.rotate")} aria-label={t("common.rotate")}>
              <RotateCw size={18} />
            </button>
          )}
          {onRemove && (
            <button type="button" className={`${iconBtn} hover:!bg-red-500/30`} onClick={() => onRemove(item)} title={t("common.remove")} aria-label={t("common.remove")}>
              <Trash2 size={18} />
            </button>
          )}
          {extraActions}

          <span className="mx-1 h-6 w-px bg-white/15" />
          <button type="button" className={iconBtn} onClick={onClose} title={t("viewer.close")} aria-label={t("viewer.close")}>
            <X size={20} />
          </button>
        </div>
      </div>

      {/* Area halaman */}
      <div className="relative min-h-0 flex-1">
        <div
          ref={stageRef}
          className="flex h-full w-full overflow-auto"
          onClick={(e) => {
            if (e.target === e.currentTarget) onClose();
          }}
        >
          {failed ? (
            <p className="m-auto text-sm text-slate-300">{t("viewer.failed")}</p>
          ) : (
            <div
              className={`relative m-auto shrink-0 overflow-hidden ${box ? "bg-white shadow-2xl" : ""}`}
              style={box ? { width: box.bw, height: box.bh } : { width: 1, height: 1 }}
            >
              {src && (
                <img
                  src={src}
                  alt={item.title}
                  draggable={false}
                  onLoad={(e) => setNatural({ w: e.currentTarget.naturalWidth, h: e.currentTarget.naturalHeight })}
                  onError={() => setFailed(true)}
                  className="absolute left-1/2 top-1/2 max-w-none"
                  style={{
                    width: box?.iw ?? 1,
                    height: box?.ih ?? 1,
                    opacity: box ? 1 : 0,
                    transform: `translate(-50%, -50%) rotate(${rotation}deg)`,
                  }}
                />
              )}
            </div>
          )}
        </div>

        {!failed && !box && (
          <div className="pointer-events-none absolute inset-0 grid place-items-center text-slate-300">
            <Loader2 size={32} className="animate-spin" />
          </div>
        )}

        {/* Navigasi kiri/kanan */}
        <button
          type="button"
          onClick={() => go(-1)}
          disabled={index <= 0}
          aria-label={t("viewer.prev")}
          title={t("viewer.prev")}
          className="absolute left-3 top-1/2 grid h-12 w-12 -translate-y-1/2 place-items-center rounded-full bg-white/10 text-white backdrop-blur transition hover:bg-white/25 disabled:hidden"
        >
          <ChevronLeft size={26} />
        </button>
        <button
          type="button"
          onClick={() => go(1)}
          disabled={index >= total - 1}
          aria-label={t("viewer.next")}
          title={t("viewer.next")}
          className="absolute right-3 top-1/2 grid h-12 w-12 -translate-y-1/2 place-items-center rounded-full bg-white/10 text-white backdrop-blur transition hover:bg-white/25 disabled:hidden"
        >
          <ChevronRight size={26} />
        </button>
      </div>

      <p className="shrink-0 border-t border-white/10 px-4 py-1.5 text-center text-[11px] text-slate-400">
        {t(onRotate || onRemove ? "viewer.hintEdit" : "viewer.hint")}
      </p>
    </div>
  );
}
