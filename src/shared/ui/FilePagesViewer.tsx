import { useMemo, useState } from "react";
import type { FileInfo } from "@/shared/ipc/types";
import { useT } from "@/shared/i18n/useT";
import { PageViewer, type ViewerItem } from "./PageViewer";

interface Props {
  /** Semua file di alat ini, sesuai urutan tampil. */
  files: FileInfo[];
  /** File yang dibuka; `null` = penampil tertutup. */
  openFileId: string | null;
  onClose: () => void;
}

/**
 * Penampil untuk alat berbasis file (merge, kompres, konversi):
 * menelusuri semua halaman semua file secara berurutan, dimulai dari
 * halaman pertama file yang diklik. Urutan = urutan hasil akhir.
 */
export function FilePagesViewer({ files, openFileId, onClose }: Props) {
  const { t } = useT();
  const [state, setState] = useState<{ openedFor: string | null; index: number }>({
    openedFor: null,
    index: 0,
  });

  const items = useMemo<ViewerItem[]>(
    () =>
      files.flatMap((file) =>
        Array.from({ length: Math.max(1, file.pages) }, (_, page) => ({
          key: `${file.id}:${page}`,
          fileId: file.id,
          page,
          title: file.name,
          subtitle: file.kind === "pdf" ? t("viewer.pageOf", { n: page + 1, total: file.pages }) : undefined,
        })),
      ),
    [files, t],
  );

  // Saat file yang dibuka berganti, mulai dari halaman pertamanya
  // (state turunan: disetel saat render agar tidak ada kedipan halaman lama).
  let index = state.index;
  if (state.openedFor !== openFileId) {
    const start = openFileId ? items.findIndex((it) => it.fileId === openFileId) : -1;
    index = Math.max(0, start);
    setState({ openedFor: openFileId, index });
  }

  if (!openFileId || items.length === 0) return null;
  return (
    <PageViewer
      items={items}
      index={Math.min(index, items.length - 1)}
      onIndexChange={(next) => setState({ openedFor: openFileId, index: next })}
      onClose={onClose}
    />
  );
}
