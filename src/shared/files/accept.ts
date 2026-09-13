/** Jenis file yang boleh diterima sebuah alat. Selaras dengan `core::files::inspect`. */
export type Accept = "pdf" | "image";

export const ACCEPT_EXTENSIONS: Record<Accept, string[]> = {
  pdf: ["pdf"],
  image: ["jpg", "jpeg", "png", "webp", "bmp", "gif", "tif", "tiff"],
};

export function extensionOf(path: string): string {
  const base = path.split(/[\\/]/).pop() ?? "";
  const dot = base.lastIndexOf(".");
  return dot >= 0 ? base.slice(dot + 1).toLowerCase() : "";
}

export function matchesAccept(path: string, accept: Accept[]): boolean {
  const ext = extensionOf(path);
  return accept.some((a) => ACCEPT_EXTENSIONS[a].includes(ext));
}
