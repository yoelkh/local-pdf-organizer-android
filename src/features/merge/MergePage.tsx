import { useCallback, useState } from "react";
import { LayoutGrid, Layers } from "lucide-react";
import { useHandoffActions, useHandoffTo } from "@/features/handoff";
import { useFileIntake } from "@/shared/files/useFileIntake";
import { prepareOutputFile } from "@/shared/platform/outputs";
import { useT } from "@/shared/i18n/useT";
import { describeError } from "@/shared/i18n/errors";
import type { OutputInfo } from "@/shared/ipc/types";
import { formatBytes, stripExtension } from "@/shared/lib/format";
import { Button } from "@/shared/ui/Button";
import { Dropzone } from "@/shared/ui/Dropzone";
import { FileCard } from "@/shared/ui/FileCard";
import { FilePagesViewer } from "@/shared/ui/FilePagesViewer";
import { GridToolbar } from "@/shared/ui/GridToolbar";
import { ProgressOverlay } from "@/shared/ui/ProgressOverlay";
import { ResultPanel } from "@/shared/ui/ResultPanel";
import { SortableGrid } from "@/shared/ui/SortableGrid";
import { useToast } from "@/shared/ui/Toast";
import { ToolLayout } from "@/shared/ui/ToolLayout";
import { useThumbSize } from "@/shared/ui/useThumbSize";
import { isTouch } from "@/shared/platform";
import { mergePdfs } from "./ipc";

const ACCEPT = ["pdf"] as const;

export function MergePage() {
  const { t } = useT();
  const toast = useToast();
  const intake = useFileIntake({ accept: [...ACCEPT] });
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<OutputInfo | null>(null);
  const [viewing, setViewing] = useState<string | null>(null);
  /** Rotasi per file (id → derajat), diterapkan ke semua halaman file itu. */
  const [rotations, setRotations] = useState<Record<string, number>>({});
  const thumbSize = useThumbSize("merge", 220);
  const nextActions = useHandoffActions("merge", "pdf", result ? [result.path] : []);
  const openInOrganize = useHandoffTo("organize");

  const totalPages = intake.files.reduce((sum, f) => sum + f.pages, 0);
  const canMerge = intake.files.length >= 2 && !busy;

  const rotate = useCallback((id: string) => {
    setRotations((prev) => ({ ...prev, [id]: ((prev[id] ?? 0) + 90) % 360 }));
  }, []);

  const remove = useCallback(
    (id: string) => {
      intake.remove(id);
      setRotations((prev) => {
        if (!(id in prev)) return prev;
        const next = { ...prev };
        delete next[id];
        return next;
      });
    },
    [intake],
  );

  async function run() {
    if (intake.files.length < 2) {
      toast.info(t("merge.needTwo"));
      return;
    }
    const first = stripExtension(intake.files[0].name);
    const outPath = await prepareOutputFile(`${first}_${t("merge.defaultName")}.pdf`, "pdf");
    if (!outPath) return;


    setBusy(true);
    try {
      const info = await mergePdfs(
        intake.files.map((f) => ({ file: f.id, rotation: rotations[f.id] ?? 0 })),
        outPath,
      );
      setResult(info);
      toast.success(t("merge.done", { pages: info.pages }));
    } catch (e) {
      toast.error(describeError(e, t));
    } finally {
      setBusy(false);
    }
  }

  function startOver() {
    setResult(null);
    setRotations({});
    intake.clear();
  }

  if (result) {
    return (
      <ResultPanel outputs={[result.path]} filePath={result.path} onStartOver={startOver} nextActions={nextActions}>
        <p className="text-center text-sm text-slate-600">

          {t("common.pages", { n: result.pages })} · {formatBytes(result.size)}
        </p>
      </ResultPanel>
    );
  }

  const hasFiles = intake.files.length > 0;

  return (
    <>
      <ProgressOverlay visible={busy} label={t("common.processing")} />
      <FilePagesViewer
        files={intake.files}
        openFileId={viewing}
        onClose={() => setViewing(null)}
        rotations={rotations}
        onRotateFile={rotate}
        onRemoveFile={remove}
      />
      <ToolLayout
        title={t("merge.title")}
        description={t("merge.description")}
        icon={<Layers size={24} />}
        accent="rose"
        options={
          hasFiles ? (
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{t("common.result")}</p>
              <p className="mt-1 text-sm text-slate-700">
                {t("merge.summary", { files: intake.files.length, pages: totalPages })}
              </p>
            </div>
          ) : undefined
        }
        action={
          hasFiles ? (
            <Button size="lg" onClick={run} disabled={!canMerge} icon={<Layers size={18} />}>
              {t("merge.action")}
            </Button>
          ) : undefined
        }
        secondary={
          hasFiles ? (
            <>
              {openInOrganize && (
                <div className="border-t border-slate-100 pt-4">
                  <p className="mb-2 text-xs text-slate-500">{t("merge.perPageHint")}</p>
                  <Button
                    variant="secondary"
                    size="sm"
                    icon={<LayoutGrid size={14} />}
                    onClick={() => openInOrganize(intake.files.map((f) => f.path))}
                  >
                    {t("merge.openInOrganize")}
                  </Button>
                </div>
              )}
              <Button variant="ghost" size="sm" onClick={startOver}>
                {t("common.clear")}
              </Button>
            </>
          ) : undefined
        }
      >
        {!hasFiles ? (
          <Dropzone accept={[...ACCEPT]} isDragging={intake.isDragging} busy={intake.busy} onPick={intake.pick} accent="rose" />
        ) : (
          <div className="flex flex-col gap-4">
            <Dropzone accept={[...ACCEPT]} isDragging={intake.isDragging} busy={intake.busy} onPick={intake.pick} accent="rose" compact />
            <GridToolbar thumbSize={thumbSize}>{isTouch ? t("merge.hintTouch") : t("merge.hint")}</GridToolbar>
            <SortableGrid
              items={intake.files}
              getId={(f) => f.id}
              onReorder={intake.reorder}
              className="grid gap-4"
              style={thumbSize.gridStyle}
              renderItem={(file, index, { isDragging }) => (
                <FileCard
                  file={file}
                  index={index}
                  rotation={rotations[file.id] ?? 0}
                  onRotate={rotate}
                  onRemove={remove}
                  onView={setViewing}
                  isDragging={isDragging}
                  thumbWidth={thumbSize.renderWidth}
                />
              )}
            />
          </div>
        )}
      </ToolLayout>
    </>
  );
}
