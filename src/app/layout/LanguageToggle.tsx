import { useT } from "@/shared/i18n/useT";
import type { Lang } from "@/shared/i18n/LanguageProvider";

const LANGS: Lang[] = ["id", "en"];

export function LanguageToggle() {
  const { lang, setLang } = useT();
  return (
    <div
      role="group"
      aria-label="Language"
      className="inline-flex overflow-hidden rounded-md border border-slate-200 text-xs font-medium"
    >
      {LANGS.map((code) => (
        <button
          key={code}
          type="button"
          onClick={() => setLang(code)}
          className={[
            "px-2.5 py-1 uppercase transition",
            lang === code ? "bg-slate-900 text-white" : "bg-white text-slate-600 hover:bg-slate-100",
          ].join(" ")}
        >
          {code}
        </button>
      ))}
    </div>
  );
}
