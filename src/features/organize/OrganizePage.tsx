import { useState } from "react";
import { CheckSquare, LayoutGrid, RotateCw, Square, Trash2, Undo2, X } from "lucide-react";
import { useFileIntake } from "@/shared/files/useFileIntake";
import { pickSavePath } from "@/shared/files/dialogs";
import { useT } from "@/shared/i18n/useT";
import { describeError } from "@/shared/i18n/errors";
import type { OutputInfo } from "@/shared/ipc/types";
import { formatBytes, stripExtension } from "@/shared/lib/format";
import { sourceTagClass } from "@/shared/lib/colors";
import { Button } from "@/shared/ui/Button";
import { Dropzone } from "@/shared/ui/Dropzone";
import { ProgressOverlay } from "@/shared/ui/ProgressOverlay";
import { ResultPanel } from "@/shared/ui/ResultPanel";
import { SortableGrid } from "@/shared/ui/SortableGrid";
import { useToast } from "@/shared/ui/Toast";
import { ToolLayout } from "@/shared/ui/ToolLayout";
import { PageTile } from "./components/PageTile";
import { usePageBoard } from "./hooks/usePageBoard";
import { organizePdf } from "./ipc";

const ACCEPT = ["pdf"] as const;
const PRIMARY = "bg-violet-600 hover:bg-violet-700";

export function OrganizePage() {
  const { t } = useT();
  const toast = useToast();
  const intake = useFileIntake({ accept: [...ACCEPT] });
  const board = usePageBoard(intake.files);
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<OutputInfo | null>(null);

  const hasFiles = intake.files.length > 0;
  const selectedCount = board.selected.size;

  async function run() {
    if (board.pages.length === 0) {
      toast.info(t("organize.noPages"));
      return;
    }
    const first = stripExtension(intake.files[0].name);
    const outPath = await pickSavePath(`${first}_${t("organize.defaultName")}.pdf`, "pdf");
    if (!outPath) return;

    setBusy(true);
    try {
      const info = await organizePdf(
        board.pages.map((p) => ({ file: p.fileId, page: p.page, rotation: p.rotation })),
        outPath,
      );
      setResult(info);
      toast.success(t("organize.done", { pages: info.pages }));
    } catch (e) {
      toast.error(describeError(e, t));
    } finally {
      setBusy(false);
    }
  }

  function startOver() {
    setResult(null);
    intake.clear();
  }

  if (result) {
    return (
      <ResultPanel filePath={result.path} onStartOver={startOver}>
        <p className="text-center text-sm text-slate-600">
          {t("common.pages", { n: result.pages })} · {formatBytes(result.size)}
        </p>
      </ResultPanel>
    );
  }

  return (
    <>
      <ProgressOverlay visible={busy} label={t("common.processing")} />
      <ToolLayout
        title={t("organize.title")}
        description={t("organize.description")}
        icon={<LayoutGrid size={24} />}
        accent="violet"
        sidebar={
          hasFiles && (
            <>
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                  {t("organize.sources")}
                </p>
                <ul className="mt-2 flex flex-col gap-1.5">
                  {intake.files.map((f) => (
                    <li key={f.id} className="flex items-center gap-2 text-sm">
                      <span className={`h-2.5 w-2.5 shrink-0 rounded-full ${sourceTagClass(board.sourceIndex.get(f.id) ?? 0)}`} />
                      <span className="min-w-0 flex-1 truncate text-slate-700" title={f.path}>
                        {f.name}
                      </span>
                      <span className="text-xs text-slate-400">{f.pages}</span>
                      <button
                        type="button"
                        onClick={() => intake.remove(f.id)}
                        className="rounded p-0.5 text-slate-400 hover:bg-slate-100 hover:text-red-600"
                        title={t("organize.removeSource")}
                        aria-label={t("organize.removeSource")}
                      >
                        <X size={14} />
                      </button>
                    </li>
                  ))}
                </ul>
              </div>

              <div className="border-t border-slate-100 pt-4">
                <p className="text-sm text-slate-700">{t("organize.pagesInResult", { n: board.pages.length })}</p>
                <p className="mt-1 text-xs text-slate-500">{t("organize.hint")}</p>
              </div>

              <div className="flex flex-col gap-2 border-t border-slate-100 pt-4">
                {selectedCount === 0 ? (
                  <Button variant="secondary" size="sm" icon={<CheckSquare size={14} />} onClick={board.selectAll}>
                    {t("common.selectAll")}
                  </Button>
                ) : (
                  <>
                    <p className="text-xs font-medium text-violet-700">{t("organize.selected", { n: selectedCount })}</p>
                    <Button variant="secondary" size="sm" icon={<RotateCw size={14} />} onClick={board.rotateSelected}>
                      {t("organize.rotateSelected")}
                    </Button>
                    <Button variant="danger" size="sm" icon={<Trash2 size={14} />} onClick={board.removeSelected}>
                      {t("common.deleteSelected", { n: selectedCount })}
                    </Button>
                    <Button variant="ghost" size="sm" icon={<Square size={14} />} onClick={board.clearSelection}>
                      {t("common.deselect")}
                    </Button>
                  </>
                )}
                <Button variant="ghost" size="sm" icon={<Undo2 size={14} />} onClick={board.reset}>
                  {t("common.reset")}
                </Button>
              </div>

              <Button size="lg" accentBg={PRIMARY} onClick={run} disabled={busy || board.pages.length === 0} icon={<LayoutGrid size={18} />}>
                {t("organize.action")}
              </Button>
            </>
          )
        }
      >
        {!hasFiles ? (
          <Dropzone accept={[...ACCEPT]} isDragging={intake.isDragging} busy={intake.busy} onPick={intake.pick} accent="violet" />
        ) : (
          <div className="flex flex-col gap-4">
            <Dropzone accept={[...ACCEPT]} isDragging={intake.isDragging} busy={intake.busy} onPick={intake.pick} accent="violet" compact />
            <SortableGrid
              items={board.pages}
              getId={(p) => p.key}
              onReorder={board.reorder}
              className="grid gap-3 grid-cols-[repeat(auto-fill,minmax(150px,1fr))]"
              renderItem={(page, index, { isDragging }) => (
                <PageTile
                  page={page}
                  position={index}
                  sourceIndex={board.sourceIndex.get(page.fileId) ?? 0}
                  selected={board.selected.has(page.key)}
                  isDragging={isDragging}
                  onToggle={board.toggleSelect}
                  onRotate={board.rotate}
                  onRemove={board.remove}
                />
              )}
            />
          </div>
        )}
      </ToolLayout>
    </>
  );
}
