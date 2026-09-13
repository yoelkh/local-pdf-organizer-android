import { Link } from "react-router-dom";
import { ArrowRight } from "lucide-react";
import { tools } from "@/features/registry";
import { useT } from "@/shared/i18n/useT";
import { accentClasses } from "@/shared/lib/colors";

/** Beranda: grid kartu alat, dibangun dari registry. */
export function HomePage() {
  const { t } = useT();
  return (
    <div className="flex flex-col gap-10">
      <header className="mx-auto max-w-2xl text-center">
        <h1 className="text-3xl font-bold tracking-tight text-slate-900">{t("home.title")}</h1>
        <p className="mt-3 text-slate-500">{t("home.subtitle")}</p>
      </header>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {tools.map((tool) => {
          const a = accentClasses(tool.accent);
          const Icon = tool.icon;
          return (
            <Link
              key={tool.id}
              to={tool.route}
              className="group flex flex-col gap-3 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:border-slate-300 hover:shadow-md"
            >
              <span className={`grid h-12 w-12 place-items-center rounded-xl ${a.softBg} ${a.text}`}>
                <Icon size={24} />
              </span>
              <div>
                <h2 className="font-semibold text-slate-900">{t(`${tool.id}.title`)}</h2>
                <p className="mt-1 text-sm text-slate-500">{t(`${tool.id}.description`)}</p>
              </div>
              <span className={`mt-auto inline-flex items-center gap-1 text-sm font-medium ${a.text}`}>
                {t(`${tool.id}.cta`)}
                <ArrowRight size={16} className="transition group-hover:translate-x-0.5" />
              </span>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
