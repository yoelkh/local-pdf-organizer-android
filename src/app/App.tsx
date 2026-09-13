import { HashRouter } from "react-router-dom";
import { LanguageProvider } from "@/shared/i18n/LanguageProvider";
import { ToastProvider } from "@/shared/ui/Toast";
import { tools } from "@/features/registry";
import { AppShell } from "@/app/layout/AppShell";
import { AppRoutes } from "@/app/routes";

/**
 * Akar aplikasi. Semua yang bergantung pada daftar fitur
 * (kamus i18n, route) diturunkan dari `features/registry`.
 */
export default function App() {
  return (
    <LanguageProvider dictionaries={tools.map((t) => t.i18n)}>
      <ToastProvider>
        <HashRouter>
          <AppShell>
            <AppRoutes />
          </AppShell>
        </HashRouter>
      </ToastProvider>
    </LanguageProvider>
  );
}
