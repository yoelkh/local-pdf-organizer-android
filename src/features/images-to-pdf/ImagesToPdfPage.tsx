import { useCallback, useState } from "react";
import { Images } from "lucide-react";
import { useHandoffActions } from "@/features/handoff";
import { useFileIntake } from "@/shared/files/useFileIntake";
import { pickSavePath } from "@/shared/files/dialogs";
import { useT } from "@/shared/i18n/useT";
import { describeError } from "@/shared/i18n/errors";
import type { OutputInfo } from "@/shared/ipc/types";
import { formatBytes, stripExtension } from "@/shared/lib/format";
import { usePageBoard, type BoardPage } from "@/shared/pageboard/usePageBoard";
import { BoardActions } from "@/shared/ui/BoardActions";
import { BoardViewer } from "@/shared/ui/BoardViewer";
import { Button } from "@/shared/ui/Button";
import { Dropzone } from "@/shared/ui/Dropzone";
import { GridToolbar } from "@/shared/ui/GridToolbar";
import { OptionGroup } from "@/shared/ui/OptionGroup";
import { PageTile } from "@/shared/ui/PageTile";
import { ProgressOverlay } from "@/shared/ui/ProgressOverlay";
import { ResultPanel } from "@/shared/ui/ResultPanel";
import { SortableGrid } from "@/shared/ui/SortableGrid";
import { useToast } from "@/shared/ui/Toast";
import { ToolLayout } from "@/shared/ui/ToolLayout";
import { useThumbSize } from "@/shared/ui/useThumbSize";
import { imagesToPdf, type ImagesToPdfOptions, type Margin, type Orientation, type PageSizeOption } from "./ipc";

const ACCEPT = ["image"] as const;
const PRIMARY = "bg-amber-500 hover:bg-amber-600";

export function ImagesToPdfPage() {
  const { t } = useT();
  const toast = useToast();
  const intake = useFileIntake({ accept: [...ACCEPT] });
  // Satu gambar = satu ubin; papan memberi urutan, rotasi, dan seleksi.
  const board = usePageBoard(intake.files, { onFileEmptied: intake.remove });
  const [options, setOptions] = useState<ImagesToPdfOptions>({
    page_size: "fit",
    orientation: "auto",
    margin: "none",
  });
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<OutputInfo | null>(null);
  const [viewKey, setViewKey] = useState<string | null>(null);
  const thumbSize = useThumbSize("imagesToPdf", 220);
  const nextActions = useHandoffActions("imagesToPdf", "pdf", result ? [result.path] : []);

  const hasFiles = intake.files.length > 0;
  const nameOf = useCallback(
    (page: BoardPage) => intake.files.find((f) => f.id === page.fileId)?.name ?? "",
    [intake.files],
  );
  const sizeOf = useCallback(
    (page: BoardPage) => {
      const f = intake.files.find((x) => x.id === page.fileId);
      return f ? `${f.width}×${f.height} · ${formatBytes(f.size)}` : "";
    },
    [intake.files],
  );

  async function run() {
    if (board.pages.length === 0) {
      toast.info(t("imagesToPdf.noImages"));
      return;
    }
    const first = stripExtension(nameOf(board.pages[0]) || "images");
    const outPath = await pickSavePath(`${first}_${t("imagesToPdf.defaultName")}.pdf`, "pdf");
    if (!outPath) return;

    setBusy(true);
    try {
      const info = await imagesToPdf(
        board.pages.map((p) => ({ file: p.fileId, rotation: p.rotation })),
        options,
        outPath,
      );
      setResult(info);
      toast.success(t("imagesToPdf.done", { pages: info.pages }));
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
      <ResultPanel filePath={result.path} onStartOver={startOver} nextActions={nextActions}>
        <p className="text-center text-sm text-slate-600">
          {t("common.pages", { n: result.pages })} · {formatBytes(result.size)}
        </p>
      </ResultPanel>
    );
  }

  const fixedSize = options.page_size !== "fit";

  return (
    <>
      <ProgressOverlay visible={busy} label={t("common.processing")} />
      <BoardViewer board={board} viewKey={viewKey} onViewKeyChange={setViewKey} titleFor={nameOf} captionFor={sizeOf} />
      <ToolLayout
        title={t("imagesToPdf.title")}
        description={t("imagesToPdf.description")}
        icon={<Images size={24} />}
        accent="amber"
        sidebar={
          hasFiles && (
            <>
              <OptionGroup<PageSizeOption>
                label={t("imagesToPdf.pageSize")}
                accent="amber"
                value={options.page_size}
                onChange={(page_size) => setOptions((o) => ({ ...o, page_size }))}
                options={[
                  { value: "fit", label: t("imagesToPdf.size.fit") },
                  { value: "a4", label: t("imagesToPdf.size.a4") },
                  { value: "letter", label: t("imagesToPdf.size.letter") },
                ]}
              />
              <div>
                <OptionGroup<Orientation>
                  label={t("imagesToPdf.orientation")}
                  accent="amber"
                  value={options.orientation}
                  disabled={!fixedSize}
                  onChange={(orientation) => setOptions((o) => ({ ...o, orientation }))}
                  options={[
                    { value: "auto", label: t("imagesToPdf.orient.auto") },
                    { value: "portrait", label: t("imagesToPdf.orient.portrait") },
                    { value: "landscape", label: t("imagesToPdf.orient.landscape") },
                  ]}
                />
                {!fixedSize && <p className="mt-1.5 text-xs text-slate-500">{t("imagesToPdf.orientationFitNote")}</p>}
              </div>
              <OptionGroup<Margin>
                label={t("imagesToPdf.margin")}
                accent="amber"
                value={options.margin}
                onChange={(margin) => setOptions((o) => ({ ...o, margin }))}
                options={[
                  { value: "none", label: t("imagesToPdf.margin.none") },
                  { value: "small", label: t("imagesToPdf.margin.small") },
                  { value: "big", label: t("imagesToPdf.margin.big") },
                ]}
              />

              <div className="border-t border-slate-100 pt-4">
                <p className="mb-2 text-sm text-slate-700">{t("imagesToPdf.pagesInResult", { n: board.pages.length })}</p>
                <BoardActions board={board} accent="amber" />
              </div>

              <Button size="lg" accentBg={PRIMARY} onClick={run} disabled={busy || board.pages.length === 0} icon={<Images size={18} />}>
                {t("imagesToPdf.action")}
              </Button>
            </>
          )
        }
      >
        {!hasFiles ? (
          <Dropzone accept={[...ACCEPT]} isDragging={intake.isDragging} busy={intake.busy} onPick={intake.pick} accent="amber" />
        ) : (
          <div className="flex flex-col gap-4">
            <Dropzone accept={[...ACCEPT]} isDragging={intake.isDragging} busy={intake.busy} onPick={intake.pick} accent="amber" compact />
            <GridToolbar thumbSize={thumbSize}>{t("imagesToPdf.hint")}</GridToolbar>
            <SortableGrid
              items={board.pages}
              getId={(p) => p.key}
              onReorder={board.reorder}
              className="grid gap-3"
              style={thumbSize.gridStyle}
              renderItem={(page, index, { isDragging }) => (
                <PageTile
                  page={page}
                  position={index}
                  showSourceTag={false}
                  caption={nameOf(page)}
                  accent="amber"
                  selected={board.selected.has(page.key)}
                  isDragging={isDragging}
                  thumbWidth={thumbSize.renderWidth}
                  onToggle={board.toggleSelect}
                  onView={setViewKey}
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
