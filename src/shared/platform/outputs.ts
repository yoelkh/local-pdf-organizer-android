import { save } from "@tauri-apps/plugin-dialog";
import { isMobile } from "./index";
import { ACCEPT_EXTENSIONS, extensionOf, type Accept } from "@/shared/files/accept";
import { pickFolder, pickSavePath } from "@/shared/files/dialogs";
import {
  newOutputDir,
  newOutputPath,
  saveOutput,
  saveOutputsToDownloads as saveOutputsToDownloadsIpc,
  shareOutputs as shareOutputsIpc,
  type SavedToDownloads,
} from "@/shared/files/ipc";
import { joinPath } from "@/shared/lib/format";

export type { SavedToDownloads };

/**
 * Menyiapkan lokasi penulisan hasil file tunggal.
 * - Desktop: menampilkan dialog simpan native (null jika dibatalkan).
 * - Mobile: membuat path baru di cache aplikasi (tidak pernah null).
 */
export async function prepareOutputFile(suggestedName: string, accept: Accept = "pdf"): Promise<string | null> {
  if (isMobile) {
    return newOutputPath(suggestedName);
  }
  return pickSavePath(suggestedName, accept);
}

/**
 * Menyiapkan lokasi penulisan hasil multi-file / folder.
 * - Desktop: menampilkan dialog pilih folder (null jika dibatalkan).
 * - Mobile: membuat direktori baru di cache aplikasi (tidak pernah null).
 */
export async function prepareOutputDir(): Promise<string | null> {
  if (isMobile) {
    return newOutputDir();
  }
  return pickFolder();
}

/**
 * Menyiapkan lokasi penulisan untuk daftar file (dipakai misalnya oleh kompres multi-file).
 * - Desktop: 1 file memakai dialog simpan, >1 file memakai dialog folder dan nama berakhiran.
 * - Mobile: setiap file mendapat path unik di cache aplikasi.
 */
export async function prepareOutputFiles(names: string[], accept: Accept = "pdf"): Promise<string[] | null> {
  if (names.length === 0) return [];
  if (isMobile) {
    return Promise.all(names.map((name) => newOutputPath(name)));
  }
  if (names.length === 1) {
    const single = await pickSavePath(names[0], accept);
    return single ? [single] : null;
  }
  const dir = await pickFolder();
  if (!dir) return null;
  return names.map((name) => joinPath(dir, name));
}

/**
 * Menyimpan file hasil ke tujuan pilihan pengguna lewat dialog simpan.
 * - Desktop: menulis ke path sistem berkas.
 * - Mobile: menulis ke URI content:// yang dikembalikan oleh ACTION_CREATE_DOCUMENT.
 * Mengembalikan false bila dibatalkan pengguna.
 */
export async function saveOutputAs(path: string, suggestedName: string): Promise<boolean> {
  const ext = extensionOf(suggestedName);
  let filters: { name: string; extensions: string[] }[] | undefined;
  if (ext === "pdf") {
    filters = [{ name: "PDF", extensions: ["pdf"] }];
  } else if (ext === "zip") {
    filters = [{ name: "ZIP", extensions: ["zip"] }];
  } else if (ACCEPT_EXTENSIONS.image.includes(ext)) {
    filters = [{ name: "Images", extensions: [ext] }];
  } else if (ext) {
    filters = [{ name: ext.toUpperCase(), extensions: [ext] }];
  }
  const destination = await save({ defaultPath: suggestedName, filters });
  if (!destination) return false;
  await saveOutput(path, destination);
  return true;
}

/**
 * Menyalin berkas-berkas hasil ke koleksi publik Downloads via MediaStore (Android).
 */
export function saveOutputsToDownloads(paths: string[]): Promise<SavedToDownloads> {
  return saveOutputsToDownloadsIpc(paths);
}

/**
 * Membuka share sheet Android untuk berkas-berkas hasil.
 */
export function shareOutputs(paths: string[]): Promise<void> {
  return shareOutputsIpc(paths);
}
