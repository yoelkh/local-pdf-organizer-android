import { isIpcError } from "@/shared/ipc/invoke";
import type { Vars } from "./LanguageProvider";

type T = (key: string, vars?: Vars) => string;

/** Pesan ramah pengguna untuk error apa pun, dengan detail teknis singkat. */
export function describeError(e: unknown, t: T): string {
  if (isIpcError(e)) {
    const friendly = t(`error.${e.code}`);
    return e.message ? `${friendly} (${e.message})` : friendly;
  }
  if (e instanceof Error) return `${t("error.internal")} (${e.message})`;
  return t("error.internal");
}
