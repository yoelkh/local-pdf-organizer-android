import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { arrayMove } from "@dnd-kit/sortable";
import type { FileInfo } from "@/shared/ipc/types";

/** Satu ubin halaman di papan. `key` unik per ubin (file + halaman). */
export interface BoardPage {
  key: string;
  fileId: string;
  page: number;
  rotation: number;
}

export interface PageBoard {
  pages: BoardPage[];
  selected: Set<string>;
  /** Indeks warna per fileId, mengikuti urutan file pertama kali masuk. */
  sourceIndex: Map<string, number>;
  reorder: (from: number, to: number) => void;
  rotate: (key: string) => void;
  remove: (key: string) => void;
  toggleSelect: (key: string) => void;
  selectAll: () => void;
  clearSelection: () => void;
  removeSelected: () => void;
  rotateSelected: () => void;
  /** Kembalikan urutan/rotasi asli semua file yang masih ada. */
  reset: () => void;
}

function pagesOf(file: FileInfo): BoardPage[] {
  return Array.from({ length: file.pages }, (_, page) => ({
    key: `${file.id}:${page}`,
    fileId: file.id,
    page,
    rotation: 0,
  }));
}

export interface PageBoardOptions {
  /** Dipanggil saat semua ubin sebuah file dihapus dari papan (mis. untuk melepas filenya). */
  onFileEmptied?: (fileId: string) => void;
}

/**
 * State papan halaman. Menyinkronkan diri dengan daftar `files`:
 * file yang baru pertama kali muncul → halamannya ditambahkan di akhir;
 * file hilang → ubinnya dibuang. Ubin yang sudah dihapus pengguna tidak
 * dimunculkan lagi selama filenya masih ada (kecuali lewat `reset`).
 */
export function usePageBoard(files: FileInfo[], options: PageBoardOptions = {}): PageBoard {
  const [pages, setPages] = useState<BoardPage[]>([]);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [order, setOrder] = useState<string[]>([]);
  const seen = useRef<Set<string>>(new Set());
  const onFileEmptied = useRef(options.onFileEmptied);
  onFileEmptied.current = options.onFileEmptied;

  useEffect(() => {
    const ids = new Set(files.map((f) => f.id));
    const fresh = files.filter((f) => !seen.current.has(f.id));
    seen.current = new Set(ids);
    setPages((prev) => {
      const kept = prev.filter((p) => ids.has(p.fileId));
      const added = fresh.flatMap(pagesOf);
      return added.length === 0 && kept.length === prev.length ? prev : [...kept, ...added];
    });
    setOrder((prev) => {
      const kept = prev.filter((id) => ids.has(id));
      const fresh = files.map((f) => f.id).filter((id) => !kept.includes(id));
      return [...kept, ...fresh];
    });
    setSelected((prev) => {
      const next = new Set(Array.from(prev).filter((k) => ids.has(k.split(":")[0])));
      return next.size === prev.size ? prev : next;
    });
  }, [files]);

  const sourceIndex = useMemo(() => new Map(order.map((id, i) => [id, i])), [order]);

  const reorder = useCallback((from: number, to: number) => {
    setPages((prev) => arrayMove(prev, from, to));
  }, []);

  const rotate = useCallback((key: string) => {
    setPages((prev) =>
      prev.map((p) => (p.key === key ? { ...p, rotation: (p.rotation + 90) % 360 } : p)),
    );
  }, []);

  /** Buang ubin dengan kunci di `keys`; laporkan file yang kehilangan semua ubinnya. */
  const dropKeys = useCallback(
    (keys: Set<string>) => {
      const next = pages.filter((p) => !keys.has(p.key));
      const remaining = new Set(next.map((p) => p.fileId));
      const emptied = new Set(pages.filter((p) => keys.has(p.key) && !remaining.has(p.fileId)).map((p) => p.fileId));
      setPages(next);
      const cb = onFileEmptied.current;
      if (cb) emptied.forEach((id) => cb(id));
    },
    [pages],
  );

  const remove = useCallback((key: string) => {
    dropKeys(new Set([key]));
    setSelected((prev) => {
      if (!prev.has(key)) return prev;
      const next = new Set(prev);
      next.delete(key);
      return next;
    });
  }, [dropKeys]);

  const toggleSelect = useCallback((key: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }, []);

  const selectAll = useCallback(() => {
    setSelected(new Set(pages.map((p) => p.key)));
  }, [pages]);

  const clearSelection = useCallback(() => setSelected(new Set()), []);

  const removeSelected = useCallback(() => {
    dropKeys(selected);
    setSelected(new Set());
  }, [selected, dropKeys]);

  const rotateSelected = useCallback(() => {
    setPages((prev) =>
      prev.map((p) => (selected.has(p.key) ? { ...p, rotation: (p.rotation + 90) % 360 } : p)),
    );
  }, [selected]);

  const reset = useCallback(() => {
    seen.current = new Set(files.map((f) => f.id));
    setPages(files.flatMap(pagesOf));
    setSelected(new Set());
  }, [files]);

  return {
    pages,
    selected,
    sourceIndex,
    reorder,
    rotate,
    remove,
    toggleSelect,
    selectAll,
    clearSelection,
    removeSelected,
    rotateSelected,
    reset,
  };
}
