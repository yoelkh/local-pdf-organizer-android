import type { ReactNode } from "react";

export interface Option<V extends string> {
  value: V;
  label: string;
  description?: string;
  icon?: ReactNode;
}

interface Props<V extends string> {
  label: string;
  value: V;
  onChange: (value: V) => void;
  options: Option<V>[];
  /** Tata letak: baris pil ("row") atau kartu bertumpuk ("stack"). */
  layout?: "row" | "stack";
  disabled?: boolean;
}

/** Sekumpulan pilihan eksklusif bergaya kartu/pil. */
export function OptionGroup<V extends string>({
  label,
  value,
  onChange,
  options,
  layout = "row",
  disabled = false,
}: Props<V>) {
  return (
    <fieldset disabled={disabled} className="disabled:opacity-60">
      <legend className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">{label}</legend>
      <div className={layout === "row" ? "flex flex-wrap gap-2" : "flex flex-col gap-2"}>
        {options.map((opt) => {
          const active = opt.value === value;
          return (
            <button
              key={opt.value}
              type="button"
              onClick={() => onChange(opt.value)}
              aria-pressed={active}
              className={[
                "rounded-lg border text-left transition",
                layout === "row" ? "px-3 py-1.5 text-sm" : "px-4 py-3",
                active
                  ? "border-rose-400 bg-rose-50 text-rose-700 ring-1 ring-rose-300"
                  : "border-slate-200 bg-white text-slate-700 hover:border-slate-300 hover:bg-slate-50",
              ].join(" ")}
            >
              <span className="flex items-center gap-2 font-medium">
                {opt.icon}
                {opt.label}
              </span>
              {opt.description && layout === "stack" && (
                <span className="mt-0.5 block text-xs text-slate-500">{opt.description}</span>
              )}
            </button>
          );
        })}
      </div>
    </fieldset>
  );
}
