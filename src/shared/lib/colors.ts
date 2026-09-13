/**
 * Warna aksen per alat. Nama kelas ditulis literal agar Tailwind
 * bisa menemukannya saat build (kelas dinamis tidak akan dihasilkan).
 */
export type Accent = "rose" | "amber" | "emerald" | "sky" | "violet" | "orange";

export interface AccentClasses {
  bg: string;
  softBg: string;
  text: string;
  border: string;
  ring: string;
  hoverBg: string;
}

const ACCENTS: Record<Accent, AccentClasses> = {
  rose: {
    bg: "bg-rose-500",
    softBg: "bg-rose-50",
    text: "text-rose-600",
    border: "border-rose-200",
    ring: "ring-rose-300",
    hoverBg: "hover:bg-rose-600",
  },
  amber: {
    bg: "bg-amber-500",
    softBg: "bg-amber-50",
    text: "text-amber-600",
    border: "border-amber-200",
    ring: "ring-amber-300",
    hoverBg: "hover:bg-amber-600",
  },
  emerald: {
    bg: "bg-emerald-500",
    softBg: "bg-emerald-50",
    text: "text-emerald-600",
    border: "border-emerald-200",
    ring: "ring-emerald-300",
    hoverBg: "hover:bg-emerald-600",
  },
  sky: {
    bg: "bg-sky-500",
    softBg: "bg-sky-50",
    text: "text-sky-600",
    border: "border-sky-200",
    ring: "ring-sky-300",
    hoverBg: "hover:bg-sky-600",
  },
  violet: {
    bg: "bg-violet-500",
    softBg: "bg-violet-50",
    text: "text-violet-600",
    border: "border-violet-200",
    ring: "ring-violet-300",
    hoverBg: "hover:bg-violet-600",
  },
  orange: {
    bg: "bg-orange-500",
    softBg: "bg-orange-50",
    text: "text-orange-600",
    border: "border-orange-200",
    ring: "ring-orange-300",
    hoverBg: "hover:bg-orange-600",
  },
};

export function accentClasses(accent: Accent): AccentClasses {
  return ACCENTS[accent];
}

/** Warna penanda sumber file (misalnya di papan halaman Organize). */
const SOURCE_TAGS = [
  "bg-rose-500",
  "bg-sky-500",
  "bg-emerald-500",
  "bg-amber-500",
  "bg-violet-500",
  "bg-orange-500",
  "bg-teal-500",
  "bg-fuchsia-500",
];

export function sourceTagClass(index: number): string {
  return SOURCE_TAGS[index % SOURCE_TAGS.length];
}
