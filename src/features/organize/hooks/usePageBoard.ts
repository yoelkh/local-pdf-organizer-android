import { useCallback, useEffect, useMemo, useState } from "react";
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

/**
 * State papan halaman. Menyinkronkan diri dengan daftar `files`:
 * file baru → halamannya ditambahkan di akhir; file hilang → ubinnya dibuang.
 */
export function usePageBoard(files: FileInfo[]): PageBoard {
  const [pages, setPages] = useState<BoardPage[]>([]);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [order, setOrder] = useState<string[]>([]);

  useEffect(() => {
    const ids = new Set(files.map((f) => f.id));
    setPages((prev) => {
      const kept = prev.filter((p) => ids.has(p.fileId));
      const known = new Set(kept.map((p) => p.fileId));
      const added = files.filter((f) => !known.has(f.id)).flatMap(pagesOf);
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

  const remove = useCallback((key: string) => {
    setPages((prev) => prev.filter((p) => p.key !== key));
    setSelected((prev) => {
      if (!prev.has(key)) return prev;
      const next = new Set(prev);
      next.delete(key);
      return next;
    });
  }, []);

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
    setPages((prev) => prev.filter((p) => !selected.has(p.key)));
    setSelected(new Set());
  }, [selected]);

  const rotateSelected = useCallback(() => {
    setPages((prev) =>
      prev.map((p) => (selected.has(p.key) ? { ...p, rotation: (p.rotation + 90) % 360 } : p)),
    );
  }, [selected]);

  const reset = useCallback(() => {
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
