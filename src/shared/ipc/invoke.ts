import { invoke } from "@tauri-apps/api/core";
import type { AppErrorCode, AppErrorPayload } from "./types";

/** Error bertipe dari backend; `code` dipakai untuk pesan terjemahan. */
export class IpcError extends Error {
  readonly code: AppErrorCode;

  constructor(payload: AppErrorPayload) {
    super(payload.message);
    this.name = "IpcError";
    this.code = payload.code;
  }
}

export function isIpcError(e: unknown): e is IpcError {
  return e instanceof IpcError;
}

function normalize(e: unknown): IpcError {
  if (e instanceof IpcError) return e;
  if (typeof e === "object" && e !== null && "code" in e && "message" in e) {
    return new IpcError(e as AppErrorPayload);
  }
  return new IpcError({ code: "internal", message: String(e) });
}

/**
 * Satu-satunya pintu ke `invoke`. Semua fitur memanggil command lewat sini
 * (melalui `ipc.ts` masing-masing) agar error selalu berbentuk `IpcError`.
 */
export async function ipc<T>(command: string, args?: Record<string, unknown>): Promise<T> {
  try {
    return await invoke<T>(command, args);
  } catch (e) {
    throw normalize(e);
  }
}
