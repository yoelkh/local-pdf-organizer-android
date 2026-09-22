import { useState } from "react";
import { FileImage } from "lucide-react";
import { useFileIntake } from "@/shared/files/useFileIntake";
import { pickFolder } from "@/shared/files/dialogs";
import { useT } from "@/shared/i18n/useT";
import { describeError } from "@/shared/i18n/errors";
import { newJobId, onProgress } from "@/shared/ipc/events";
import { baseName } from "@/shared/lib/format";
import { Button } from "@/shared/ui/Button";
import { Dropzone } from "@/shared/ui/Dropzone";
import { FileCard } from "@/shared/ui/FileCard";
import { FilePagesViewer } from "@/shared/ui/FilePagesViewer";
import { GridToolbar } from "@/shared/ui/GridToolbar";
import { OptionGroup } from "@/shared/ui/OptionGroup";
import { ProgressOverlay } from "@/shared/ui/ProgressOverlay";
import { ResultPanel } from "@/shared/ui/ResultPanel";
import { SortableGrid } from "@/shared/ui/SortableGrid";
import { useToast } from "@/shared/ui/Toast";
import { ToolLayout } from "@/shared/ui/ToolLayout";
import { useThumbSize } from "@/shared/ui/useThumbSize";
import { pdfToImages, type OutputFormat, type PdfToImagesResult } from "./ipc";

const ACCEPT = ["pdf"] as const;
const PRIMARY = "bg-sky-600 hover:bg-sky-700";
const DPI_CHOICES = ["72", "150", "300"] as const;
type DpiChoice = (typeof DPI_CHOICES)[number];
const RANGE_PATTERN = /^\s*$|^\s*\d*\s*(-\s*\d*)?\s*(,\s*\d*\s*(-\s*\d*)?\s*)*$/;

interface FileResult {
  name: string;
  result: PdfToImagesResult;
}

interface Progress {
  fileIndex: number;
  fileCount: number;
  name: string;
  current: number;
  total: number;
}

export function PdfToImagesPage() {
  const { t } = useT();
  const toast = useToast();
  const intake = useFileIntake({ accept: [...ACCEPT] });
  const [format, setFormat] = useState<OutputFormat>("png");
  const [dpi, setDpi] = useState<DpiChoice>("150");
  const [pages, setPages] = useState("");
  const [zip, setZip] = useState(false);
  const [progress, setProgress] = useState<Progress | null>(null);
  const [results, setResults] = useState<{ outDir: string; files: FileResult[] } | null>(null);
  const [viewing, setViewing] = useState<string | null>(null);
  const thumbSize = useThumbSize("pdfToImages", 220);

  const hasFiles = intake.files.length > 0;
  const many = intake.files.length > 1;

  async function run() {
    if (intake.files.length === 0) return;
    if (!RANGE_PATTERN.test(pages)) {
      toast.error(t("pdfToImages.badRange"));
      return;
    }
    const outDir = await pickFolder();
    if (!outDir) return;

    const done: FileResult[] = [];
    try {
      for (let i = 0; i < intake.files.length; i++) {
        const file = intake.files[i];
        const jobId = newJobId();
        const base = { fileIndex: i, fileCount: intake.files.length, name: file.name };
        setProgress({ ...base, current: 0, total: file.pages });
        const unlisten = await onProgress(jobId, (e) => setProgress({ ...base, current: e.current, total: e.total }));
        try {
          const res = await pdfToImages(
            file.id,
            { format, dpi: Number(dpi), pages: pages.trim() || null, zip },
            outDir,
            jobId,
          );
          done.push({ name: file.name, result: res });
        } finally {
          unlisten();
        }
      }
      setResults({ outDir, files: done });
      toast.success(t("pdfToImages.done", { n: done.reduce((s, f) => s + f.result.count, 0) }));
    } catch (e) {
      toast.error(describeError(e, t));
      if (done.length > 0) setResults({ outDir, files: done });
    } finally {
      setProgress(null);
    }
  }

  function startOver() {
    setResults(null);
    intake.clear();
  }

  if (results) {
    const single = results.files.length === 1 ? results.files[0].result : null;
    return (
      <ResultPanel filePath={single?.zip_path ?? undefined} folderPath={results.outDir} onStartOver={startOver}>
        <ul className="flex flex-col divide-y divide-slate-100 text-sm">
          {results.files.map((f) => (
            <li key={f.result.zip_path ?? f.name} className="flex items-center justify-between gap-3 py-2">
              <span className="min-w-0 truncate font-medium text-slate-800">{f.name}</span>
              <span className="shrink-0 text-slate-500">
                {f.result.zip_path
                  ? t("pdfToImages.resultZipShort", { n: f.result.count, zip: baseName(f.result.zip_path) })
                  : t("pdfToImages.resultFiles", { n: f.result.count })}
              </span>
            </li>
          ))}
        </ul>
      </ResultPanel>
    );
  }

  return (
    <>
      <ProgressOverlay
        visible={progress !== null}
        label={
          progress
            ? many
              ? t("pdfToImages.renderingFile", { i: progress.fileIndex + 1, n: progress.fileCount, name: progress.name })
              : t("pdfToImages.rendering")
            : ""
        }
        current={progress?.current}
        total={progress?.total}
      />
      <FilePagesViewer files={intake.files} openFileId={viewing} onClose={() => setViewing(null)} onRemoveFile={intake.remove} />
      <ToolLayout
        title={t("pdfToImages.title")}
        description={t("pdfToImages.description")}
        icon={<FileImage size={24} />}
        accent="sky"
        sidebar={
          hasFiles && (
            <>
              <OptionGroup<OutputFormat>
                label={t("pdfToImages.format")}
                accent="sky"
                value={format}
                onChange={setFormat}
                options={[
                  { value: "png", label: "PNG" },
                  { value: "jpg", label: "JPG" },
                ]}
              />
              <OptionGroup<DpiChoice>
                label={t("pdfToImages.dpi")}
                accent="sky"
                value={dpi}
                onChange={setDpi}
                layout="stack"
                options={DPI_CHOICES.map((d) => ({ value: d, label: t(`pdfToImages.dpi.${d}`) }))}
              />
              <label className="flex flex-col gap-1.5">
                <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">{t("pdfToImages.pages")}</span>
                <input
                  type="text"
                  value={pages}
                  onChange={(e) => setPages(e.target.value)}
                  placeholder={t("pdfToImages.pagesPlaceholder")}
                  className="h-10 rounded-lg border border-slate-300 px-3 text-sm focus:border-sky-400 focus:outline-none focus:ring-2 focus:ring-sky-200"
                />
                {many && <span className="text-xs text-slate-500">{t("pdfToImages.pagesAppliesAll")}</span>}
              </label>
              <label className="flex items-center gap-2 text-sm text-slate-700">
                <input type="checkbox" checked={zip} onChange={(e) => setZip(e.target.checked)} className="h-4 w-4 accent-sky-600" />
                {many ? t("pdfToImages.zipEach") : t("pdfToImages.zip")}
              </label>
              <Button size="lg" accentBg={PRIMARY} onClick={run} disabled={progress !== null} icon={<FileImage size={18} />}>
                {t("pdfToImages.action")}
              </Button>
              <Button variant="ghost" size="sm" onClick={intake.clear}>
                {t("common.clear")}
              </Button>
            </>
          )
        }
      >
        {!hasFiles ? (
          <Dropzone accept={[...ACCEPT]} isDragging={intake.isDragging} busy={intake.busy} onPick={intake.pick} accent="sky" />
        ) : (
          <div className="flex flex-col gap-4">
            <Dropzone accept={[...ACCEPT]} isDragging={intake.isDragging} busy={intake.busy} onPick={intake.pick} accent="sky" compact />
            <GridToolbar thumbSize={thumbSize}>{t("view.hintFilesPlain")}</GridToolbar>
            <SortableGrid
              items={intake.files}
              getId={(f) => f.id}
              onReorder={intake.reorder}
              className="grid gap-4"
              style={thumbSize.gridStyle}
              renderItem={(file, _index, { isDragging }) => (
                <FileCard
                  file={file}
                  onRemove={intake.remove}
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
