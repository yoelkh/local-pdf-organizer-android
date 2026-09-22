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
  /** Border tegas (500) untuk status terpilih. */
  borderStrong: string;
  /** Border sedang (400) untuk pilihan aktif. */
  borderActive: string;
  /** Teks gelap (700) di atas latar lembut. */
  textStrong: string;
}

const ACCENTS: Record<Accent, AccentClasses> = {
  rose: {
    bg: "bg-rose-500",
    softBg: "bg-rose-50",
    text: "text-rose-600",
    border: "border-rose-200",
    ring: "ring-rose-300",
    hoverBg: "hover:bg-rose-600",
    borderStrong: "border-rose-500",
    borderActive: "border-rose-400",
    textStrong: "text-rose-700",
  },
  amber: {
    bg: "bg-amber-500",
    softBg: "bg-amber-50",
    text: "text-amber-600",
    border: "border-amber-200",
    ring: "ring-amber-300",
    hoverBg: "hover:bg-amber-600",
    borderStrong: "border-amber-500",
    borderActive: "border-amber-400",
    textStrong: "text-amber-700",
  },
  emerald: {
    bg: "bg-emerald-500",
    softBg: "bg-emerald-50",
    text: "text-emerald-600",
    border: "border-emerald-200",
    ring: "ring-emerald-300",
    hoverBg: "hover:bg-emerald-600",
    borderStrong: "border-emerald-500",
    borderActive: "border-emerald-400",
    textStrong: "text-emerald-700",
  },
  sky: {
    bg: "bg-sky-500",
    softBg: "bg-sky-50",
    text: "text-sky-600",
    border: "border-sky-200",
    ring: "ring-sky-300",
    hoverBg: "hover:bg-sky-600",
    borderStrong: "border-sky-500",
    borderActive: "border-sky-400",
    textStrong: "text-sky-700",
  },
  violet: {
    bg: "bg-violet-500",
    softBg: "bg-violet-50",
    text: "text-violet-600",
    border: "border-violet-200",
    ring: "ring-violet-300",
    hoverBg: "hover:bg-violet-600",
    borderStrong: "border-violet-500",
    borderActive: "border-violet-400",
    textStrong: "text-violet-700",
  },
  orange: {
    bg: "bg-orange-500",
    softBg: "bg-orange-50",
    text: "text-orange-600",
    border: "border-orange-200",
    ring: "ring-orange-300",
    hoverBg: "hover:bg-orange-600",
    borderStrong: "border-orange-500",
    borderActive: "border-orange-400",
    textStrong: "text-orange-700",
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
