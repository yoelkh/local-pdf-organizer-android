import type { ComponentType } from "react";
import type { LucideIcon } from "lucide-react";
import type { Dictionaries } from "@/shared/i18n/LanguageProvider";
import type { Accent } from "@/shared/lib/colors";

/**
 * Kontrak satu alat. Setiap folder `features/<alat>/` mengekspor satu objek ini
 * dari `index.ts`, lalu didaftarkan di `features/registry.ts`.
 *
 * Kunci i18n wajib ada: `<id>.title` dan `<id>.description`.
 */
export interface ToolDefinition {
  /** Id unik, juga prefix kunci i18n (mis. "merge"). */
  id: string;
  /** Route hash (mis. "/merge"). */
  route: string;
  icon: LucideIcon;
  accent: Accent;
  Page: ComponentType;
  i18n: Dictionaries;
}
