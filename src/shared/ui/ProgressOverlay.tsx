import { Loader2 } from "lucide-react";

interface Props {
  visible: boolean;
  label: string;
  current?: number;
  total?: number;
}

/** Lapisan penuh layar saat pekerjaan berjalan; menampilkan bar bila ada angka. */
export function ProgressOverlay({ visible, label, current, total }: Props) {
  if (!visible) return null;
  const hasBar = typeof current === "number" && typeof total === "number" && total > 0;
  const pct = hasBar ? Math.min(100, Math.round((current / total) * 100)) : 0;

  return (
    <div className="fixed inset-0 z-40 grid place-items-center bg-slate-900/40 backdrop-blur-sm p-4">
      <div className="w-full max-w-[calc(100vw-2rem)] sm:w-80 rounded-2xl bg-white p-6 shadow-2xl">
        <div className="flex items-center gap-3 min-w-0">
          <Loader2 className="animate-spin text-rose-500 shrink-0 motion-reduce:animate-none" size={22} />
          <p className="font-medium text-slate-800 break-words min-w-0">{label}</p>
        </div>
        {hasBar && (
          <div className="mt-4">
            <div className="h-2 overflow-hidden rounded-full bg-slate-100">
              <div className="h-full rounded-full bg-rose-500 transition-all" style={{ width: `${pct}%` }} />
            </div>
            <p className="mt-2 text-right text-xs text-slate-500">
              {current} / {total}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
