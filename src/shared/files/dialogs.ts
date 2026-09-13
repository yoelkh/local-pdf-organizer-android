import { open, save } from "@tauri-apps/plugin-dialog";
import { ACCEPT_EXTENSIONS, type Accept } from "./accept";

const FILTER_NAMES: Record<Accept, string> = { pdf: "PDF", image: "Images" };

function filtersFor(accept: Accept[]) {
  return accept.map((a) => ({ name: FILTER_NAMES[a], extensions: ACCEPT_EXTENSIONS[a] }));
}

/** Dialog pilih file; mengembalikan daftar path (kosong bila dibatalkan). */
export async function pickFiles(accept: Accept[], multiple = true): Promise<string[]> {
  const result = await open({ multiple, directory: false, filters: filtersFor(accept) });
  if (!result) return [];
  return Array.isArray(result) ? result : [result];
}

/** Dialog simpan; `null` bila dibatalkan. */
export async function pickSavePath(defaultName: string, accept: Accept = "pdf"): Promise<string | null> {
  const result = await save({ defaultPath: defaultName, filters: filtersFor([accept]) });
  return result ?? null;
}

/** Dialog pilih folder; `null` bila dibatalkan. */
export async function pickFolder(): Promise<string | null> {
  const result = await open({ directory: true, multiple: false });
  return typeof result === "string" ? result : null;
}
