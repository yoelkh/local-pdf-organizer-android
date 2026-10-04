import { useCallback, useEffect, useLayoutEffect, useRef, useState, type ReactNode } from "react";
import { ChevronLeft, ChevronRight, Loader2, Maximize, RotateCw, Trash2, X, ZoomIn, ZoomOut } from "lucide-react";
import { thumbnailUrl } from "@/shared/files/thumbnails";
import { useT } from "@/shared/i18n/useT";
import { isTouch } from "@/shared/platform";
import { useViewerGestures } from "./useViewerGestures";

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
 * Jumlah event popstate yang diabaikan karena dipicu secara internal
 * oleh pemanggilan history.back() saat penampil ditutup lewat tombol X/Esc.
 */
let ignorePopCount = 0;
let activeViewerInstances = 0;

// Konsumsi event popstate internal saat tidak ada penampil aktif agar tidak bocor
if (typeof window !== "undefined") {
  window.addEventListener("popstate", () => {
    if (activeViewerInstances === 0 && ignorePopCount > 0) {
      ignorePopCount--;
    }
  });
}

/**
 * Penampil halaman layar penuh: navigasi antar halaman, zoom, dan (opsional)
 * putar/hapus.
 * - Keyboard: ← → pindah, + − zoom, 0 pas layar, R putar, Del hapus, Esc tutup.
 * - Sentuh: pinch to zoom (kontinu), drag to pan saat zoom, double-tap toggle 1x/2x,
 *   swipe horizontal saat 1x untuk pindah halaman.
 */
export function PageViewer({ items, index, onIndexChange, onClose, onRotate, onRemove, extraActions }: Props) {
  const { t } = useT();
  const item = items[index];
  const total = items.length;

  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  const onIndexChangeRef = useRef(onIndexChange);
  onIndexChangeRef.current = onIndexChange;

  const onRotateRef = useRef(onRotate);
  onRotateRef.current = onRotate;

  const onRemoveRef = useRef(onRemove);
  onRemoveRef.current = onRemove;

  const stageRef = useRef<HTMLDivElement>(null);
  const [stage, setStage] = useState({ w: 0, h: 0 });
  const [src, setSrc] = useState<string | null>(null);
  const [natural, setNatural] = useState<{ w: number; h: number } | null>(null);
  const [failed, setFailed] = useState(false);
  const [zoom, setZoom] = useState(1);

  // Tutup otomatis bila daftar menjadi kosong / indeks tidak valid.
  useEffect(() => {
    if (!item) onCloseRef.current();
  }, [item]);

  // Android back button / browser back: tutup penampil tanpa merusak HashRouter
  useEffect(() => {
    activeViewerInstances++;
    let closedByBack = false;

    // Push entry histori tepat satu kali saat penampil pertama kali terbuka
    if (!window.history.state?.viewerModal) {
      window.history.pushState({ viewerModal: true }, "", window.location.href);
    }

    const onPopState = () => {
      if (ignorePopCount > 0) {
        ignorePopCount--;
        return;
      }
      closedByBack = true;
      onCloseRef.current();
    };

    window.addEventListener("popstate", onPopState);

    return () => {
      activeViewerInstances--;
      window.removeEventListener("popstate", onPopState);

      if (!closedByBack) {
        // Tunda satu siklus event loop untuk mengakomodasi remount StrictMode
        setTimeout(() => {
          if (activeViewerInstances === 0 && window.history.state?.viewerModal) {
            ignorePopCount++;
            window.history.back();
          }
        }, 0);
      }
    };
  }, []);

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
      if (next >= 0 && next < total) onIndexChangeRef.current(next);
    },
    [index, total],
  );

  const zoomBy = useCallback((direction: 1 | -1) => {
    setZoom((z) => {
      if (direction === 1) {
        const next = ZOOM_STEPS.find((s) => s > z + 0.05) ?? ZOOM_STEPS[ZOOM_STEPS.length - 1];
        return next;
      } else {
        const reversed = [...ZOOM_STEPS].reverse();
        const prev = reversed.find((s) => s < z - 0.05) ?? ZOOM_STEPS[0];
        return prev;
      }
    });
  }, []);

  // Pasang hook gestur sentuh (pinch, double-tap, swipe)
  useViewerGestures({
    stageRef,
    zoom,
    setZoom,
    onPrevPage: () => go(-1),
    onNextPage: () => go(1),
    canPrev: index > 0,
    canNext: index < total - 1,
  });

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (!item) return;
      switch (e.key) {
        case "Escape":
          onCloseRef.current();
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
          onIndexChangeRef.current(0);
          break;
        case "End":
          onIndexChangeRef.current(total - 1);
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
          onRotateRef.current?.(item);
          break;
        case "Delete":
          onRemoveRef.current?.(item);
          break;
        default:
          return;
      }
      e.preventDefault();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [item, total, go, zoomBy]);

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
    "grid h-11 w-11 place-items-center rounded-lg text-slate-200 transition hover:bg-white/15 active:bg-white/25 disabled:opacity-30 disabled:hover:bg-transparent";

  return (
    <div
      className="fixed inset-0 z-50 flex flex-col bg-slate-950/90 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      style={{
        paddingLeft: "env(safe-area-inset-left, 0px)",
        paddingRight: "env(safe-area-inset-right, 0px)",
      }}
    >
      {/* Bilah atas: tombol berukuran jari (>=44px), tombol tutup tersemat di kanan, tidak meluap di 360px */}
      <div
        className="flex min-h-14 shrink-0 items-center justify-between gap-2 border-b border-white/10 px-2 pb-1.5 min-[400px]:px-4 text-slate-100"
        style={{
          paddingTop: "max(0.5rem, env(safe-area-inset-top, 0px))",
        }}
      >
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium" title={item.title}>
            {item.title}
          </p>
          <p className="truncate text-xs text-slate-400">
            {item.subtitle ? `${item.subtitle} · ` : ""}
            {t("viewer.position", { n: index + 1, total })}
          </p>
        </div>

        <div className="flex shrink-0 items-center gap-1">
          {/* Kontrol zoom: hanya untuk mouse desktop (di sentuh digantikan pinch & double-tap) */}
          <div className="hidden pointer-fine:flex items-center gap-1">
            <button
              type="button"
              className={iconBtn}
              onClick={() => zoomBy(-1)}
              disabled={zoom <= ZOOM_STEPS[0]}
              title={t("viewer.zoomOut")}
              aria-label={t("viewer.zoomOut")}
            >
              <ZoomOut size={18} />
            </button>
            <span className="w-11 text-center text-xs tabular-nums text-slate-300">{Math.round(zoom * 100)}%</span>
            <button
              type="button"
              className={iconBtn}
              onClick={() => zoomBy(1)}
              disabled={zoom >= ZOOM_STEPS[ZOOM_STEPS.length - 1]}
              title={t("viewer.zoomIn")}
              aria-label={t("viewer.zoomIn")}
            >
              <ZoomIn size={18} />
            </button>
            <button
              type="button"
              className={iconBtn}
              onClick={() => setZoom(1)}
              disabled={Math.abs(zoom - 1) < 0.01}
              title={t("viewer.fit")}
              aria-label={t("viewer.fit")}
            >
              <Maximize size={18} />
            </button>
            {(onRotate || onRemove || extraActions) && <span className="mx-1 h-6 w-px bg-white/15" />}
          </div>

          {onRotate && (
            <button
              type="button"
              className={iconBtn}
              onClick={() => onRotate(item)}
              title={t("common.rotate")}
              aria-label={t("common.rotate")}
            >
              <RotateCw size={18} />
            </button>
          )}
          {onRemove && (
            <button
              type="button"
              className={`${iconBtn} hover:!bg-red-500/30 active:!bg-red-500/40`}
              onClick={() => onRemove(item)}
              title={t("common.remove")}
              aria-label={t("common.remove")}
            >
              <Trash2 size={18} />
            </button>
          )}
          {extraActions}

          <span className="hidden pointer-fine:block mx-1 h-6 w-px bg-white/15" />
          <button
            type="button"
            className={iconBtn}
            onClick={onClose}
            title={t("viewer.close")}
            aria-label={t("viewer.close")}
          >
            <X size={20} />
          </button>
        </div>
      </div>

      {/* Area halaman */}
      <div className="relative min-h-0 flex-1">
        <div
          ref={stageRef}
          className="flex h-full w-full overflow-auto select-none"
          style={{ touchAction: zoom > 1.05 ? "pan-x pan-y" : "pan-y" }}
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
          style={{ left: "max(0.75rem, env(safe-area-inset-left, 0px))" }}
          className="absolute top-1/2 grid h-12 w-12 -translate-y-1/2 place-items-center rounded-full bg-white/10 text-white backdrop-blur transition hover:bg-white/25 active:bg-white/35 disabled:hidden"
        >
          <ChevronLeft size={26} />
        </button>
        <button
          type="button"
          onClick={() => go(1)}
          disabled={index >= total - 1}
          aria-label={t("viewer.next")}
          title={t("viewer.next")}
          style={{ right: "max(0.75rem, env(safe-area-inset-right, 0px))" }}
          className="absolute top-1/2 grid h-12 w-12 -translate-y-1/2 place-items-center rounded-full bg-white/10 text-white backdrop-blur transition hover:bg-white/25 active:bg-white/35 disabled:hidden"
        >
          <ChevronRight size={26} />
        </button>
      </div>

      <p
        className="shrink-0 border-t border-white/10 px-4 py-2 text-center text-[11px] text-slate-400"
        style={{
          paddingBottom: "max(0.5rem, env(safe-area-inset-bottom, 0px))",
        }}
      >
        {isTouch ? t("viewer.hintTouch") : t(onRotate || onRemove ? "viewer.hintEdit" : "viewer.hint")}
      </p>
    </div>
  );
}
