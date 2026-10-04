import { useEffect, useRef, type RefObject } from "react";

interface GestureOptions {
  stageRef: RefObject<HTMLDivElement | null>;
  zoom: number;
  setZoom: (updater: number | ((prev: number) => number)) => void;
  onPrevPage: () => void;
  onNextPage: () => void;
  canPrev: boolean;
  canNext: boolean;
}

/**
 * Hook gestur sentuh untuk penampil halaman:
 * - Pinch to zoom (kontinu, dijepit 1x-4x, berpusat di titik tengah cubitan).
 * - Drag to pan saat diperbesar (menggunakan scroll kontainer native).
 * - Double-tap untuk toggle 1x <-> 2x di titik ketukan.
 * - Swipe horizontal saat 1x untuk pindah halaman sebelumnya/berikutnya.
 * - Pinch dicegah agar tidak memicu swipe halaman atau zoom viewport browser.
 */
export function useViewerGestures({
  stageRef,
  zoom,
  setZoom,
  onPrevPage,
  onNextPage,
  canPrev,
  canNext,
}: GestureOptions) {
  const zoomRef = useRef(zoom);
  zoomRef.current = zoom;

  const canPrevRef = useRef(canPrev);
  canPrevRef.current = canPrev;

  const canNextRef = useRef(canNext);
  canNextRef.current = canNext;

  const onPrevPageRef = useRef(onPrevPage);
  onPrevPageRef.current = onPrevPage;

  const onNextPageRef = useRef(onNextPage);
  onNextPageRef.current = onNextPage;

  const setZoomRef = useRef(setZoom);
  setZoomRef.current = setZoom;

  useEffect(() => {
    const el = stageRef.current;
    if (!el) return;

    let isPinching = false;
    let pinchOccurred = false;
    let startDist = 0;
    let startZoom = 1;

    let singleTouchStartX = 0;
    let singleTouchStartY = 0;
    let singleTouchStartTime = 0;
    let isSwiping = false;

    let lastTapTime = 0;
    let lastTapX = 0;
    let lastTapY = 0;

    function getDistance(t1: Touch, t2: Touch) {
      return Math.hypot(t2.clientX - t1.clientX, t2.clientY - t1.clientY);
    }

    function getMidpoint(t1: Touch, t2: Touch, rect: DOMRect) {
      return {
        x: (t1.clientX + t2.clientX) / 2 - rect.left,
        y: (t1.clientY + t2.clientY) / 2 - rect.top,
      };
    }

    function onTouchStart(e: TouchEvent) {
      if (e.touches.length === 2) {
        // Mulai pinch zoom
        isPinching = true;
        pinchOccurred = true;
        isSwiping = false;
        // Cegah zoom viewport browser bawaan
        if (e.cancelable) e.preventDefault();

        startDist = getDistance(e.touches[0], e.touches[1]);
        startZoom = zoomRef.current;
      } else if (e.touches.length === 1) {
        if (!isPinching) {
          singleTouchStartX = e.touches[0].clientX;
          singleTouchStartY = e.touches[0].clientY;
          singleTouchStartTime = Date.now();
          // Hanya izinkan swipe jika sedang tidak di-zoom
          isSwiping = zoomRef.current <= 1.05;
        }
      }
    }

    function onTouchMove(e: TouchEvent) {
      if (e.touches.length === 2 && isPinching) {
        if (e.cancelable) e.preventDefault();
        const currentDist = getDistance(e.touches[0], e.touches[1]);
        if (startDist <= 0) return;

        const scale = currentDist / startDist;
        const targetZoom = Math.min(4, Math.max(1, startZoom * scale));

        const rect = el!.getBoundingClientRect();
        const currentMidpoint = getMidpoint(e.touches[0], e.touches[1], rect);

        // Pertahankan titik tengah pinch di posisi yang sama saat zoom
        const currentZ = zoomRef.current;
        if (currentZ > 0) {
          const ratio = targetZoom / currentZ;
          el!.scrollLeft = (el!.scrollLeft + currentMidpoint.x) * ratio - currentMidpoint.x;
          el!.scrollTop = (el!.scrollTop + currentMidpoint.y) * ratio - currentMidpoint.y;
        }

        setZoomRef.current(targetZoom);
      } else if (e.touches.length === 1 && isSwiping && !pinchOccurred) {
        const dx = e.touches[0].clientX - singleTouchStartX;
        const dy = e.touches[0].clientY - singleTouchStartY;

        // Cegah scroll browser jika gestur dominan horizontal
        if (Math.abs(dx) > Math.abs(dy) && Math.abs(dx) > 10) {
          if (e.cancelable) e.preventDefault();
        }
      }
    }

    function onTouchEnd(e: TouchEvent) {
      if (isPinching) {
        if (e.touches.length < 2) {
          isPinching = false;
        }
        return;
      }

      if (e.touches.length === 0) {
        const endedTouch = e.changedTouches[0];
        if (!endedTouch) return;

        // Jangan picu tap atau swipe bila baru saja mencubit
        if (pinchOccurred) {
          pinchOccurred = false;
          return;
        }

        const dx = endedTouch.clientX - singleTouchStartX;
        const dy = endedTouch.clientY - singleTouchStartY;
        const dist = Math.hypot(dx, dy);
        const duration = Date.now() - singleTouchStartTime;

        // Double-tap: dua ketukan cepat (< 350ms) di area berdekatan (< 35px)
        if (dist < 15 && duration < 300) {
          const now = Date.now();
          const tapDist = Math.hypot(endedTouch.clientX - lastTapX, endedTouch.clientY - lastTapY);

          if (now - lastTapTime < 350 && tapDist < 35) {
            if (e.cancelable) e.preventDefault();
            lastTapTime = 0;

            if (zoomRef.current > 1.05) {
              setZoomRef.current(1);
            } else {
              const rect = el!.getBoundingClientRect();
              const tapX = endedTouch.clientX - rect.left;
              const tapY = endedTouch.clientY - rect.top;

              setZoomRef.current(2);
              el!.scrollLeft = (el!.scrollLeft + tapX) * 2 - tapX;
              el!.scrollTop = (el!.scrollTop + tapY) * 2 - tapY;
            }
            return;
          } else {
            lastTapTime = now;
            lastTapX = endedTouch.clientX;
            lastTapY = endedTouch.clientY;
          }
        }

        // Horizontal swipe saat 1x
        if (isSwiping && zoomRef.current <= 1.05) {
          const absDx = Math.abs(dx);
          const absDy = Math.abs(dy);
          if (absDx > 40 && absDx > absDy * 1.3 && duration < 500) {
            if (dx > 0 && canPrevRef.current) {
              onPrevPageRef.current();
            } else if (dx < 0 && canNextRef.current) {
              onNextPageRef.current();
            }
          }
        }

        isSwiping = false;
      }
    }

    function onTouchCancel() {
      isPinching = false;
      isSwiping = false;
      pinchOccurred = false;
    }

    el.addEventListener("touchstart", onTouchStart, { passive: false });
    el.addEventListener("touchmove", onTouchMove, { passive: false });
    el.addEventListener("touchend", onTouchEnd, { passive: false });
    el.addEventListener("touchcancel", onTouchCancel, { passive: false });

    return () => {
      el.removeEventListener("touchstart", onTouchStart);
      el.removeEventListener("touchmove", onTouchMove);
      el.removeEventListener("touchend", onTouchEnd);
      el.removeEventListener("touchcancel", onTouchCancel);
    };
  }, [stageRef]);
}
