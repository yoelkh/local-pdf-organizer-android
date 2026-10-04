/** Jenis file yang boleh diterima sebuah alat. Selaras dengan `core::files::inspect`. */
export type Accept = "pdf" | "image";

export const ACCEPT_EXTENSIONS: Record<Accept, string[]> = {
  pdf: ["pdf"],
  image: ["jpg", "jpeg", "png", "webp", "bmp", "gif", "tif", "tiff"],
};

/** Cek apakah path merupakan URI Android `content://`. */
export function isContentUri(path: string): boolean {
  return path.startsWith("content://");
}

export function extensionOf(path: string): string {
  const base = path.split(/[\\/]/).pop() ?? "";
  const dot = base.lastIndexOf(".");
  return dot >= 0 ? base.slice(dot + 1).toLowerCase() : "";
}

export function matchesAccept(path: string, accept: Accept[]): boolean {
  // URI Android tidak memiliki ekstensi file; jenis file ditentukan oleh backend saat inspeksi.
  if (isContentUri(path)) return true;
  const ext = extensionOf(path);
  return accept.some((a) => ACCEPT_EXTENSIONS[a].includes(ext));
}

