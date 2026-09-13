import type { ReactNode } from "react";
import type { Accent } from "@/shared/lib/colors";
import { accentClasses } from "@/shared/lib/colors";

interface Props {
  title: string;
  description: string;
  icon: ReactNode;
  accent: Accent;
  /** Panel kanan: pengaturan dan tombol aksi utama. Sembunyikan dengan `null`. */
  sidebar?: ReactNode;
  children: ReactNode;
}

/** Kerangka halaman alat: judul + konten utama + sidebar pengaturan. */
export function ToolLayout({ title, description, icon, accent, sidebar, children }: Props) {
  const a = accentClasses(accent);
  return (
    <div className="flex flex-col gap-6">
      <header className="flex items-start gap-4">
        <span className={`grid h-12 w-12 shrink-0 place-items-center rounded-xl ${a.softBg} ${a.text}`}>
          {icon}
        </span>
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">{title}</h1>
          <p className="mt-1 text-sm text-slate-500">{description}</p>
        </div>
      </header>

      <div className={sidebar ? "grid gap-6 lg:grid-cols-[1fr_300px]" : ""}>
        <section className="min-w-0">{children}</section>
        {sidebar && (
          <aside className="lg:sticky lg:top-20 lg:self-start">
            <div className="flex flex-col gap-5 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              {sidebar}
            </div>
          </aside>
        )}
      </div>
    </div>
  );
}
