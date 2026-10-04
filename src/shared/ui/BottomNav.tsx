import { Link, useLocation } from "react-router-dom";
import { Home } from "lucide-react";
import { tools } from "@/features/registry";
import { useT } from "@/shared/i18n/useT";
import { accentClasses } from "@/shared/lib/colors";

/**
 * Bar navigasi bawah untuk layar mobile/kompak (< lg).
 * Menampilkan Beranda + 5 alat dengan target sentuh >= 44px dan warna aksen saat aktif.
 */
export function BottomNav() {
  const { t } = useT();
  const { pathname } = useLocation();

  const isHomeActive = pathname === "/";

  return (
    <nav
      aria-label="Mobile Navigation"
      className="shrink-0 border-t border-slate-200 bg-white/95 backdrop-blur lg:hidden pb-[env(safe-area-inset-bottom,0px)]"
    >
      <div className="flex h-14 items-stretch justify-around px-1">
        <Link
          to="/"
          className="flex flex-1 flex-col items-center justify-center min-h-[44px] py-1 px-0.5 text-center transition"
          aria-current={isHomeActive ? "page" : undefined}
        >
          <Home size={20} className={isHomeActive ? "text-rose-600" : "text-slate-400"} />
          <span
            className={[
              "mt-0.5 text-[11px] leading-tight truncate max-w-full",
              isHomeActive ? "text-rose-600 font-semibold" : "text-slate-500 font-medium",
            ].join(" ")}
          >
            {t("nav.home")}
          </span>
        </Link>

        {tools.map((tool) => {
          const isActive = pathname === tool.route;
          const accent = accentClasses(tool.accent);
          const Icon = tool.icon;

          return (
            <Link
              key={tool.id}
              to={tool.route}
              className="flex flex-1 flex-col items-center justify-center min-h-[44px] py-1 px-0.5 text-center transition"
              aria-current={isActive ? "page" : undefined}
            >
              <Icon size={20} className={isActive ? accent.text : "text-slate-400"} />
              <span
                className={[
                  "mt-0.5 text-[11px] leading-tight truncate max-w-full",
                  isActive ? `${accent.text} font-semibold` : "text-slate-500 font-medium",
                ].join(" ")}
              >
                {t(`${tool.id}.short`)}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
