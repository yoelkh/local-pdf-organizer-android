import { convertFileSrc } from "@tauri-apps/api/core";
import { renderThumbnail } from "./ipc";

const cache = new Map<string, Promise<string>>();

/** URL asset thumbnail untuk (file, halaman, lebar); hasil di-cache per sesi. */
export function thumbnailUrl(fileId: string, page: number, width: number): Promise<string> {
  const key = `${fileId}:${page}:${width}`;
  let pending = cache.get(key);
  if (!pending) {
    pending = renderThumbnail(fileId, page, width).then((path) => convertFileSrc(path));
    pending.catch(() => cache.delete(key));
    cache.set(key, pending);
  }
  return pending;
}

export function forgetThumbnails(fileId: string) {
  for (const key of Array.from(cache.keys())) {
    if (key.startsWith(`${fileId}:`)) cache.delete(key);
  }
}
