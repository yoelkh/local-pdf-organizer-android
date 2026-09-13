/** Tipe yang mencerminkan `core::files::types` dan `core::error` di backend. */

export type FileKind = "pdf" | "image";

export interface FileInfo {
  id: string;
  path: string;
  name: string;
  kind: FileKind;
  size: number;
  /** Jumlah halaman (PDF) atau 1 (gambar). */
  pages: number;
  /** Ukuran halaman pertama: poin (PDF) atau piksel (gambar). */
  width: number;
  height: number;
}

export interface OutputInfo {
  path: string;
  name: string;
  size: number;
  pages: number;
}

export type AppErrorCode =
  | "io"
  | "not_found"
  | "unsupported"
  | "invalid_input"
  | "pdf"
  | "image"
  | "engine"
  | "internal";

export interface AppErrorPayload {
  code: AppErrorCode;
  message: string;
}

export interface ProgressEvent {
  job_id: string;
  current: number;
  total: number;
}
