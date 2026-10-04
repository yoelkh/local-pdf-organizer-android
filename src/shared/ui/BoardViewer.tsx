import { useMemo } from "react";
import { MoveLeft, MoveRight } from "lucide-react";
import { useT } from "@/shared/i18n/useT";
import type { BoardPage, PageBoard } from "@/shared/pageboard/usePageBoard";
import { PageViewer, type ViewerItem } from "./PageViewer";

interface Props {
  board: PageBoard;
  /** Kunci ubin yang sedang dilihat; `null` = tertutup. */
  viewKey: string | null;
  onViewKeyChange: (key: string | null) => void;
  titleFor: (page: BoardPage) => string;
  captionFor: (page: BoardPage) => string;
}

const ICON_BTN =
  "grid h-11 w-11 place-items-center rounded-lg text-slate-200 transition hover:bg-white/15 active:bg-white/25 disabled:opacity-30 disabled:hover:bg-transparent";

/**
 * Penampil layar penuh yang terikat ke sebuah papan halaman: putar, hapus,
 * dan pindahkan halaman lebih awal/akhir langsung dari penampil.
 */
export function BoardViewer({ board, viewKey, onViewKeyChange, titleFor, captionFor }: Props) {
  const { t } = useT();

  const items = useMemo<ViewerItem[]>(
    () =>
      board.pages.map((p) => ({
        key: p.key,
        fileId: p.fileId,
        page: p.page,
        rotation: p.rotation,
        title: titleFor(p),
        subtitle: captionFor(p),
      })),
    [board.pages, titleFor, captionFor],
  );

  const index = viewKey ? board.pages.findIndex((p) => p.key === viewKey) : -1;
  if (index < 0) return null;

  function remove(key: string) {
    const i = board.pages.findIndex((p) => p.key === key);
    const neighbor = board.pages[i + 1] ?? board.pages[i - 1];
    board.remove(key);
    onViewKeyChange(neighbor ? neighbor.key : null);
  }

  function move(delta: -1 | 1) {
    const target = index + delta;
    if (target < 0 || target >= board.pages.length) return;
    board.reorder(index, target);
  }

  return (
    <PageViewer
      items={items}
      index={index}
      onIndexChange={(i) => onViewKeyChange(board.pages[i]?.key ?? null)}
      onClose={() => onViewKeyChange(null)}
      onRotate={(item) => board.rotate(item.key)}
      onRemove={(item) => remove(item.key)}
      extraActions={
        <>
          <button
            type="button"
            onClick={() => move(-1)}
            disabled={index <= 0}
            title={t("board.moveEarlier")}
            aria-label={t("board.moveEarlier")}
            className={ICON_BTN}
          >
            <MoveLeft size={18} />
          </button>
          <button
            type="button"
            onClick={() => move(1)}
            disabled={index >= board.pages.length - 1}
            title={t("board.moveLater")}
            aria-label={t("board.moveLater")}
            className={ICON_BTN}
          >
            <MoveRight size={18} />
          </button>
        </>
      }
    />
  );
}
