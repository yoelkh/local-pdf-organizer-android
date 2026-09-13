import type { ButtonHTMLAttributes, ReactNode } from "react";
import { Loader2 } from "lucide-react";

type Variant = "primary" | "secondary" | "ghost" | "danger";
type Size = "sm" | "md" | "lg";

interface Props extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  loading?: boolean;
  icon?: ReactNode;
  /** Kelas warna latar untuk `primary` (default rose). */
  accentBg?: string;
}

const VARIANTS: Record<Variant, string> = {
  primary: "text-white shadow-sm disabled:opacity-60",
  secondary:
    "border border-slate-300 bg-white text-slate-700 hover:bg-slate-50 disabled:opacity-60",
  ghost: "text-slate-600 hover:bg-slate-100 disabled:opacity-60",
  danger: "bg-red-600 text-white hover:bg-red-700 disabled:opacity-60",
};

const SIZES: Record<Size, string> = {
  sm: "h-8 px-3 text-xs gap-1.5",
  md: "h-10 px-4 text-sm gap-2",
  lg: "h-12 px-6 text-base gap-2",
};

export function Button({
  variant = "primary",
  size = "md",
  loading = false,
  icon,
  accentBg = "bg-rose-500 hover:bg-rose-600",
  className = "",
  children,
  disabled,
  ...rest
}: Props) {
  return (
    <button
      type="button"
      disabled={disabled || loading}
      className={[
        "inline-flex items-center justify-center rounded-lg font-medium transition select-none",
        "focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-slate-400",
        "disabled:cursor-not-allowed",
        VARIANTS[variant],
        variant === "primary" ? accentBg : "",
        SIZES[size],
        className,
      ].join(" ")}
      {...rest}
    >
      {loading ? <Loader2 size={16} className="animate-spin" /> : icon}
      {children}
    </button>
  );
}
