import { createContext, useCallback, useMemo, useState, type ReactNode } from "react";
import { baseId } from "./base.id";
import { baseEn } from "./base.en";

export type Lang = "id" | "en";
export type Dictionary = Record<string, string>;
/** Kamus satu fitur: kunci yang sama untuk setiap bahasa. */
export interface Dictionaries {
  id: Dictionary;
  en: Dictionary;
}

export type Vars = Record<string, string | number>;

export interface LanguageContextValue {
  lang: Lang;
  setLang: (lang: Lang) => void;
  t: (key: string, vars?: Vars) => string;
}

export const LanguageContext = createContext<LanguageContextValue | null>(null);

const STORAGE_KEY = "lang";
const DEFAULT_LANG: Lang = "id";

function readStoredLang(): Lang {
  try {
    const v = localStorage.getItem(STORAGE_KEY);
    return v === "en" || v === "id" ? v : DEFAULT_LANG;
  } catch {
    return DEFAULT_LANG;
  }
}

function interpolate(template: string, vars?: Vars): string {
  if (!vars) return template;
  return template.replace(/\{(\w+)\}/g, (_, name: string) =>
    name in vars ? String(vars[name]) : `{${name}}`,
  );
}

/**
 * Menggabungkan kamus dasar dengan kamus setiap fitur (dari registry).
 * Kunci fitur diprefix nama fitur (`merge.title`) sehingga tidak bertabrakan.
 */
export function LanguageProvider({
  dictionaries,
  children,
}: {
  dictionaries: Dictionaries[];
  children: ReactNode;
}) {
  const [lang, setLangState] = useState<Lang>(readStoredLang);

  const merged = useMemo<Record<Lang, Dictionary>>(() => {
    const id: Dictionary = { ...baseId };
    const en: Dictionary = { ...baseEn };
    for (const d of dictionaries) {
      Object.assign(id, d.id);
      Object.assign(en, d.en);
    }
    return { id, en };
  }, [dictionaries]);

  const setLang = useCallback((next: Lang) => {
    setLangState(next);
    try {
      localStorage.setItem(STORAGE_KEY, next);
    } catch {
      /* penyimpanan tidak tersedia; abaikan */
    }
    document.documentElement.lang = next;
  }, []);

  const t = useCallback(
    (key: string, vars?: Vars) => {
      const text = merged[lang][key] ?? merged[DEFAULT_LANG][key] ?? key;
      return interpolate(text, vars);
    },
    [merged, lang],
  );

  const value = useMemo(() => ({ lang, setLang, t }), [lang, setLang, t]);

  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>;
}
