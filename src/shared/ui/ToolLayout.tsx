import { useState, type ReactNode } from "react";
import { SlidersHorizontal } from "lucide-react";
import type { Accent } from "@/shared/lib/colors";
import { accentClasses } from "@/shared/lib/colors";
import { useT } from "@/shared/i18n/useT";
import { Button } from "./Button";
import { BottomSheet } from "./BottomSheet";

interface Props {
  title: string;
  description: string;
  icon: ReactNode;
  accent: Accent;
  /** Pengaturan dan informasi (mis. resolusi, margin, ringkasan). */
  options?: ReactNode;
  /** Tombol aksi utama (mis. Gabungkan PDF, Ekspor PDF). */
  action?: ReactNode;
  /** Aksi sekunder (mis. bersihkan, buka di atur halaman). */
  secondary?: ReactNode;
  children: ReactNode;
}

/**
 * Kerangka halaman alat:
 * - Desktop (>= lg): kartu samping berisi options, action, secondary.
 * - Mobile (< lg): aksi utama di sticky bottom bar + tombol Options untuk membuka bottom sheet.
 */
export function ToolLayout({
  title,
  description,
  icon,
  accent,
  options,
  action,
  secondary,
  children,
}: Props) {
  const { t } = useT();
  const [sheetOpen, setSheetOpen] = useState(false);
  const a = accentClasses(accent);

  const hasAnySlot = Boolean(options || action || secondary);

  return (
    <div className="flex flex-col gap-6">
      <header className="flex items-start gap-3 sm:gap-4">
        <span className={`grid h-11 w-11 sm:h-12 sm:w-12 shrink-0 place-items-center rounded-xl ${a.softBg} ${a.text}`}>
          {icon}
        </span>
        <div className="min-w-0">
          <h1 className="text-xl sm:text-2xl font-semibold text-slate-900 break-words">{title}</h1>
          <p className="mt-1 text-xs sm:text-sm text-slate-500">{description}</p>
        </div>
      </header>

      <div className={hasAnySlot ? "grid gap-6 lg:grid-cols-[1fr_300px]" : ""}>
        <section className={`min-w-0 ${hasAnySlot ? "pb-32 lg:pb-0" : ""}`}>
          {children}
        </section>

        {hasAnySlot && (
          <aside className="hidden lg:block lg:sticky lg:top-20 lg:self-start">
            <div className="flex flex-col gap-5 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              {options}
              {action}
              {secondary}
            </div>
          </aside>
        )}
      </div>

      {/* Sticky bottom action bar untuk mobile (< lg) */}
      {hasAnySlot && (
        <div className="fixed bottom-[calc(3.5rem+env(safe-area-inset-bottom,0px))] left-0 right-0 z-20 border-t border-slate-200 bg-white/95 px-4 py-3 backdrop-blur lg:hidden pl-[calc(1rem+env(safe-area-inset-left,0px))] pr-[calc(1rem+env(safe-area-inset-right,0px))]">
          <div className="mx-auto flex max-w-[1700px] items-center gap-2">
            {options && (
              <Button
                variant="secondary"
                size="lg"
                icon={<SlidersHorizontal size={18} />}
                onClick={() => setSheetOpen(true)}
                className="shrink-0 px-3 sm:px-4"
              >
                {t("common.options")}
              </Button>
            )}
            {action && <div className="min-w-0 flex-1 [&>button]:!w-full">{action}</div>}
          </div>
        </div>
      )}

      {/* Bottom Sheet untuk opsi & aksi sekunder pada mobile */}
      {options && (
        <BottomSheet open={sheetOpen} onClose={() => setSheetOpen(false)} title={t("common.options")}>
          <div className="flex flex-col gap-5">
            {options}
            {secondary && (
              <div className="border-t border-slate-100 pt-4 flex flex-col gap-3">
                {secondary}
              </div>
            )}
          </div>
        </BottomSheet>
      )}
    </div>
  );
}
