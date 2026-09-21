import { useMemo, useState } from "react";
import { CheckSquare, LayoutGrid, MoveLeft, MoveRight, RotateCw, Square, Trash2, Undo2, X } from "lucide-react";
import { useFileIntake } from "@/shared/files/useFileIntake";
import { pickSavePath } from "@/shared/files/dialogs";
import { useT } from "@/shared/i18n/useT";
import { describeError } from "@/shared/i18n/errors";
import type { OutputInfo } from "@/shared/ipc/types";
import { formatBytes, stripExtension } from "@/shared/lib/format";
import { sourceTagClass } from "@/shared/lib/colors";
import { Button } from "@/shared/ui/Button";
import { Dropzone } from "@/shared/ui/Dropzone";
import { GridToolbar } from "@/shared/ui/GridToolbar";
import { PageViewer, type ViewerItem } from "@/shared/ui/PageViewer";
import { ProgressOverlay } from "@/shared/ui/ProgressOverlay";
import { ResultPanel } from "@/shared/ui/ResultPanel";
import { SortableGrid } from "@/shared/ui/SortableGrid";
import { useToast } from "@/shared/ui/Toast";
import { ToolLayout } from "@/shared/ui/ToolLayout";
import { useThumbSize } from "@/shared/ui/useThumbSize";
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
  const [viewKey, setViewKey] = useState<string | null>(null);
  const thumbSize = useThumbSize("organize", 210);

  const hasFiles = intake.files.length > 0;
  const selectedCount = board.selected.size;

  // Penampil halaman besar mengikuti urutan papan saat ini.
  const viewerItems = useMemo<ViewerItem[]>(() => {
    const names = new Map(intake.files.map((f) => [f.id, f.name]));
    return board.pages.map((p) => ({
      key: p.key,
      fileId: p.fileId,
      page: p.page,
      rotation: p.rotation,
      title: names.get(p.fileId) ?? "",
      subtitle: t("common.page", { n: p.page + 1 }),
    }));
  }, [board.pages, intake.files, t]);
  const viewIndex = viewKey ? board.pages.findIndex((p) => p.key === viewKey) : -1;

  function removeFromViewer(key: string) {
    const i = board.pages.findIndex((p) => p.key === key);
    const neighbor = board.pages[i + 1] ?? board.pages[i - 1];
    board.remove(key);
    setViewKey(neighbor ? neighbor.key : null);
  }

  function moveInViewer(delta: -1 | 1) {
    const target = viewIndex + delta;
    if (viewIndex < 0 || target < 0 || target >= board.pages.length) return;
    board.reorder(viewIndex, target);
  }

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
      {viewIndex >= 0 && (
        <PageViewer
          items={viewerItems}
          index={viewIndex}
          onIndexChange={(i) => setViewKey(board.pages[i]?.key ?? null)}
          onClose={() => setViewKey(null)}
          onRotate={(item) => board.rotate(item.key)}
          onRemove={(item) => removeFromViewer(item.key)}
          extraActions={
            <>
              <button
                type="button"
                onClick={() => moveInViewer(-1)}
                disabled={viewIndex <= 0}
                title={t("organize.moveEarlier")}
                aria-label={t("organize.moveEarlier")}
                className="grid h-9 w-9 place-items-center rounded-lg text-slate-200 transition hover:bg-white/15 disabled:opacity-30 disabled:hover:bg-transparent"
              >
                <MoveLeft size={18} />
              </button>
              <button
                type="button"
                onClick={() => moveInViewer(1)}
                disabled={viewIndex >= board.pages.length - 1}
                title={t("organize.moveLater")}
                aria-label={t("organize.moveLater")}
                className="grid h-9 w-9 place-items-center rounded-lg text-slate-200 transition hover:bg-white/15 disabled:opacity-30 disabled:hover:bg-transparent"
              >
                <MoveRight size={18} />
              </button>
            </>
          }
        />
      )}
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
            <GridToolbar thumbSize={thumbSize}>{t("organize.hint")}</GridToolbar>
            <SortableGrid
              items={board.pages}
              getId={(p) => p.key}
              onReorder={board.reorder}
              className="grid gap-3"
              style={thumbSize.gridStyle}
              renderItem={(page, index, { isDragging }) => (
                <PageTile
                  thumbWidth={thumbSize.renderWidth}
                  onView={setViewKey}
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
