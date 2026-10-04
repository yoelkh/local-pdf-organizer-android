import { useEffect, type ReactNode } from "react";
import { X } from "lucide-react";
import { useT } from "@/shared/i18n/useT";

interface Props {
  open: boolean;
  onClose: () => void;
  title?: string;
  children: ReactNode;
}

/**
 * Bottom sheet modal untuk layar mobile (< lg).
 * - Menutup saat backdrop diketuk, tombol tutup ditekan, atau tombol Escape ditekan.
 * - Konten scroll secara internal dan memperhitungkan safe-area-inset-bottom.
 * - Animasi hanya transform/opacity <= 250ms dan menghormati prefers-reduced-motion.
 */
export function BottomSheet({ open, onClose, title, children }: Props) {
  const { t } = useT();

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-40 lg:hidden" role="dialog" aria-modal="true" aria-label={title ?? t("common.options")}>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs transition-opacity duration-200 motion-reduce:transition-none"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Sheet Panel */}
      <div className="fixed inset-x-0 bottom-0 z-50 flex max-h-[85dvh] flex-col rounded-t-2xl border-t border-slate-200 bg-white shadow-2xl transition-transform duration-200 ease-out motion-reduce:transition-none pb-[calc(1.5rem+env(safe-area-inset-bottom,0px))]">
        {/* Drag handle pill */}
        <div className="mx-auto mt-3 h-1 w-10 shrink-0 rounded-full bg-slate-300" />

        {/* Sheet Header */}
        <div className="flex items-center justify-between border-b border-slate-100 px-5 py-3">
          <h2 className="text-base font-semibold text-slate-800">{title ?? t("common.options")}</h2>
          <button
            type="button"
            onClick={onClose}
            aria-label={t("common.close")}
            className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition"
          >
            <X size={18} />
          </button>
        </div>

        {/* Scrollable Sheet Content */}
        <div className="flex-1 overflow-y-auto overscroll-contain px-5 py-4">
          {children}
        </div>
      </div>
    </div>
  );
}
