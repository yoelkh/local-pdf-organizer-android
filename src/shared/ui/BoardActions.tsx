import { CheckSquare, RotateCw, Square, Trash2, Undo2 } from "lucide-react";
import { useT } from "@/shared/i18n/useT";
import { accentClasses, type Accent } from "@/shared/lib/colors";
import type { PageBoard } from "@/shared/pageboard/usePageBoard";
import { Button } from "./Button";

interface Props {
  board: PageBoard;
  accent: Accent;
}

/** Blok aksi seleksi untuk papan halaman: pilih semua, putar/hapus terpilih, reset. */
export function BoardActions({ board, accent }: Props) {
  const { t } = useT();
  const a = accentClasses(accent);
  const selectedCount = board.selected.size;

  return (
    <div className="flex flex-col gap-2">
      {selectedCount === 0 ? (
        <Button variant="secondary" size="sm" className="w-full justify-start" icon={<CheckSquare size={14} />} onClick={board.selectAll}>
          {t("common.selectAll")}
        </Button>
      ) : (
        <>
          <p className={`text-xs font-medium ${a.textStrong}`}>{t("board.selected", { n: selectedCount })}</p>
          <Button variant="secondary" size="sm" className="w-full justify-start" icon={<RotateCw size={14} />} onClick={board.rotateSelected}>
            {t("board.rotateSelected")}
          </Button>
          <Button variant="danger" size="sm" className="w-full justify-start" icon={<Trash2 size={14} />} onClick={board.removeSelected}>
            {t("common.deleteSelected", { n: selectedCount })}
          </Button>
          <Button variant="ghost" size="sm" className="w-full justify-start" icon={<Square size={14} />} onClick={board.clearSelection}>
            {t("common.deselect")}
          </Button>
        </>
      )}
      <Button variant="ghost" size="sm" className="w-full justify-start" icon={<Undo2 size={14} />} onClick={board.reset}>
        {t("common.reset")}
      </Button>
    </div>
  );
}
