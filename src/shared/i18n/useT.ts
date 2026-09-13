import { useContext } from "react";
import { LanguageContext, type LanguageContextValue } from "./LanguageProvider";

export function useT(): LanguageContextValue {
  const ctx = useContext(LanguageContext);
  if (!ctx) throw new Error("useT must be used inside <LanguageProvider>");
  return ctx;
}
