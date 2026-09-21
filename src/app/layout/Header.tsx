import { Link, useLocation } from "react-router-dom";
import { FileText } from "lucide-react";
import { useT } from "@/shared/i18n/useT";
import { tools } from "@/features/registry";
import { LanguageToggle } from "./LanguageToggle";
import { accentClasses } from "@/shared/lib/colors";

export function Header() {
  const { t } = useT();
  const { pathname } = useLocation();
  const active = tools.find((tool) => tool.route === pathname);

  return (
    <header className="sticky top-0 z-20 border-b border-slate-200 bg-white/90 backdrop-blur">
      <div className="mx-auto flex h-14 w-full max-w-[1700px] items-center justify-between px-6">
        <Link to="/" className="flex items-center gap-2 font-semibold text-slate-900">
          <span className="grid h-8 w-8 place-items-center rounded-lg bg-rose-500 text-white">
            <FileText size={18} />
          </span>
          <span>{t("app.name")}</span>
        </Link>

        <nav className="hidden items-center gap-1 md:flex">
          {tools.map((tool) => {
            const isActive = tool.id === active?.id;
            const accent = accentClasses(tool.accent);
            return (
              <Link
                key={tool.id}
                to={tool.route}
                className={[
                  "rounded-md px-3 py-1.5 text-sm transition",
                  isActive
                    ? `${accent.softBg} ${accent.text} font-medium`
                    : "text-slate-600 hover:bg-slate-100 hover:text-slate-900",
                ].join(" ")}
              >
                {t(`${tool.id}.title`)}
              </Link>
            );
          })}
        </nav>

        <LanguageToggle />
      </div>
    </header>
  );
}
