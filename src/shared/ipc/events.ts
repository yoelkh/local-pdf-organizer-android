import { listen, type UnlistenFn } from "@tauri-apps/api/event";
import type { ProgressEvent } from "./types";

const PROGRESS_EVENT = "progress";

export function newJobId(): string {
  return crypto.randomUUID();
}

/** Dengarkan kemajuan untuk satu `jobId`. Panggil fungsi hasilnya untuk berhenti. */
export async function onProgress(
  jobId: string,
  handler: (event: ProgressEvent) => void,
): Promise<UnlistenFn> {
  return listen<ProgressEvent>(PROGRESS_EVENT, (event) => {
    if (event.payload.job_id === jobId) handler(event.payload);
  });
}
