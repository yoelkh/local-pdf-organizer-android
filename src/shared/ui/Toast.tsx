import { createContext, useCallback, useContext, useMemo, useRef, useState, type ReactNode } from "react";
import { AlertCircle, CheckCircle2, Info, X } from "lucide-react";

type Kind = "success" | "error" | "info";

interface ToastItem {
  id: number;
  kind: Kind;
  message: string;
}

export interface ToastApi {
  success: (message: string) => void;
  error: (message: string) => void;
  info: (message: string) => void;
}

const ToastContext = createContext<ToastApi | null>(null);

const STYLE: Record<Kind, { wrap: string; Icon: typeof Info }> = {
  success: { wrap: "border-emerald-200 bg-emerald-50 text-emerald-800", Icon: CheckCircle2 },
  error: { wrap: "border-red-200 bg-red-50 text-red-800", Icon: AlertCircle },
  info: { wrap: "border-sky-200 bg-sky-50 text-sky-800", Icon: Info },
};

export function ToastProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<ToastItem[]>([]);
  const counter = useRef(0);

  const dismiss = useCallback((id: number) => {
    setItems((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const push = useCallback(
    (kind: Kind, message: string) => {
      const id = ++counter.current;
      setItems((prev) => [...prev.slice(-4), { id, kind, message }]);
      window.setTimeout(() => dismiss(id), kind === "error" ? 8000 : 4500);
    },
    [dismiss],
  );

  const api = useMemo<ToastApi>(
    () => ({
      success: (m) => push("success", m),
      error: (m) => push("error", m),
      info: (m) => push("info", m),
    }),
    [push],
  );

  return (
    <ToastContext.Provider value={api}>
      {children}
      <div className="pointer-events-none fixed bottom-4 right-4 z-50 flex w-96 max-w-[calc(100vw-2rem)] flex-col gap-2">
        {items.map((t) => {
          const { wrap, Icon } = STYLE[t.kind];
          return (
            <div
              key={t.id}
              role="status"
              className={`pointer-events-auto flex items-start gap-2 rounded-lg border px-3 py-2 text-sm shadow-lg ${wrap}`}
            >
              <Icon size={18} className="mt-0.5 shrink-0" />
              <span className="flex-1 break-words">{t.message}</span>
              <button
                type="button"
                onClick={() => dismiss(t.id)}
                className="rounded p-0.5 opacity-60 hover:opacity-100"
                aria-label="Close"
              >
                <X size={14} />
              </button>
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast(): ToastApi {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("useToast must be used inside <ToastProvider>");
  return ctx;
}
