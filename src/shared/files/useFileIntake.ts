import { useCallback, useEffect, useRef, useState } from "react";
import { arrayMove } from "@dnd-kit/sortable";
import type { FileInfo } from "@/shared/ipc/types";
import { useToast } from "@/shared/ui/Toast";
import { useT } from "@/shared/i18n/useT";
import { describeError } from "@/shared/i18n/errors";
import { isContentUri, matchesAccept, type Accept } from "./accept";
import { pickFiles } from "./dialogs";
import { useFileDrop } from "./dragDrop";
import { takeHandoff } from "./handoff";
import { inspectFiles, removeFile } from "./ipc";
import { forgetThumbnails } from "./thumbnails";

export interface FileIntake {
  files: FileInfo[];
  busy: boolean;
  isDragging: boolean;
  /** Daftarkan path (dari dialog/drop). Path yang tidak cocok `accept` dilewati. */
  addPaths: (paths: string[]) => Promise<void>;
  /** Buka dialog pilih file. */
  pick: () => Promise<void>;
  remove: (id: string) => void;
  clear: () => void;
  reorder: (from: number, to: number) => void;
  /** Ganti daftar secara langsung (dipakai alat yang butuh kontrol penuh). */
  setFiles: React.Dispatch<React.SetStateAction<FileInfo[]>>;
}

interface Options {
  accept: Accept[];
  /** Hanya satu file sekaligus; file baru menggantikan yang lama. */
  single?: boolean;
  /** Muat file titipan dari alat lain saat pertama dibuka (default: ya). */
  consumeHandoff?: boolean;
}

/**
 * Sumber file untuk sebuah alat: dialog native + drop dari Explorer,
 * lalu didaftarkan ke backend. Semua halaman fitur memakai hook ini.
 */
export function useFileIntake({ accept, single = false, consumeHandoff = true }: Options): FileIntake {
  const [files, setFiles] = useState<FileInfo[]>([]);
  const [busy, setBusy] = useState(false);
  const toast = useToast();
  const { t } = useT();

  const addPaths = useCallback(
    async (paths: string[]) => {
      const wanted = paths.filter((p) => matchesAccept(p, accept));
      const rejected = paths.length - wanted.length;
      if (rejected > 0) toast.info(t("intake.skippedType", { n: rejected }));
      if (wanted.length === 0) return;

      setBusy(true);
      try {
        const result = await inspectFiles(single ? wanted.slice(0, 1) : wanted);
        // Filter berdasarkan jenis file (kind) yang didukung alat.
        // Pada Android, content:// melewati pra-filter ekstensi, sehingga validasi jenis dilakukan di sini.
        const validFiles = result.files.filter((f) => accept.includes(f.kind));
        const wrongKindFiles = result.files.filter((f) => !accept.includes(f.kind));

        if (wrongKindFiles.length > 0) {
          wrongKindFiles.forEach((f) => void removeFile(f.id).catch(() => undefined));
          toast.info(t("intake.skippedType", { n: wrongKindFiles.length }));
        }

        if (validFiles.length > 0) {
          setFiles((prev) => {
            if (single) {
              prev.forEach((f) => void removeFile(f.id).catch(() => undefined));
              validFiles.slice(1).forEach((f) => void removeFile(f.id).catch(() => undefined));
              return validFiles.slice(0, 1);
            }
            const known = new Set(prev.map((f) => f.path));
            const fresh = validFiles.filter((f) => !known.has(f.path));
            validFiles
              .filter((f) => known.has(f.path))
              .forEach((f) => void removeFile(f.id).catch(() => undefined));
            return [...prev, ...fresh];
          });
        }
        result.skipped.forEach((s) =>
          toast.error(t("intake.skippedFile", { name: isContentUri(s.path) ? t("common.file") : baseName(s.path) })),
        );

      } catch (e) {
        toast.error(describeError(e, t));
      } finally {
        setBusy(false);
      }
    },
    [accept, single, toast, t],
  );

  const pick = useCallback(async () => {
    const paths = await pickFiles(accept, !single);
    if (paths.length > 0) await addPaths(paths);
  }, [accept, single, addPaths]);

  const remove = useCallback((id: string) => {
    setFiles((prev) => prev.filter((f) => f.id !== id));
    forgetThumbnails(id);
    void removeFile(id).catch(() => undefined);
  }, []);

  const clear = useCallback(() => {
    setFiles((prev) => {
      prev.forEach((f) => {
        forgetThumbnails(f.id);
        void removeFile(f.id).catch(() => undefined);
      });
      return [];
    });
  }, []);

  const reorder = useCallback((from: number, to: number) => {
    setFiles((prev) => arrayMove(prev, from, to));
  }, []);

  const { isDragging } = useFileDrop(addPaths);

  // File yang dititipkan alat lain (handoff) dimuat sekali saat mount.
  const latestAddPaths = useRef(addPaths);
  latestAddPaths.current = addPaths;
  useEffect(() => {
    if (!consumeHandoff) return;
    const paths = takeHandoff();
    if (paths.length > 0) void latestAddPaths.current(paths);
  }, [consumeHandoff]);

  return { files, busy, isDragging, addPaths, pick, remove, clear, reorder, setFiles };
}

function baseName(path: string): string {
  return path.split(/[\\/]/).pop() ?? path;
}
