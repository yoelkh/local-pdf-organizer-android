import { useState } from "react";
import { FileImage } from "lucide-react";
import { useFileIntake } from "@/shared/files/useFileIntake";
import { pickFolder } from "@/shared/files/dialogs";
import { useT } from "@/shared/i18n/useT";
import { describeError } from "@/shared/i18n/errors";
import { newJobId, onProgress } from "@/shared/ipc/events";
import { Button } from "@/shared/ui/Button";
import { Dropzone } from "@/shared/ui/Dropzone";
import { FileCard } from "@/shared/ui/FileCard";
import { OptionGroup } from "@/shared/ui/OptionGroup";
import { ProgressOverlay } from "@/shared/ui/ProgressOverlay";
import { ResultPanel } from "@/shared/ui/ResultPanel";
import { useToast } from "@/shared/ui/Toast";
import { ToolLayout } from "@/shared/ui/ToolLayout";
import { pdfToImages, type OutputFormat, type PdfToImagesResult } from "./ipc";

const ACCEPT = ["pdf"] as const;
const PRIMARY = "bg-sky-600 hover:bg-sky-700";
const DPI_CHOICES = ["72", "150", "300"] as const;
type DpiChoice = (typeof DPI_CHOICES)[number];
const RANGE_PATTERN = /^\s*$|^\s*\d*\s*(-\s*\d*)?\s*(,\s*\d*\s*(-\s*\d*)?\s*)*$/;

export function PdfToImagesPage() {
  const { t } = useT();
  const toast = useToast();
  const intake = useFileIntake({ accept: [...ACCEPT], single: true });
  const [format, setFormat] = useState<OutputFormat>("png");
  const [dpi, setDpi] = useState<DpiChoice>("150");
  const [pages, setPages] = useState("");
  const [zip, setZip] = useState(false);
  const [progress, setProgress] = useState<{ current: number; total: number } | null>(null);
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<PdfToImagesResult | null>(null);

  const file = intake.files[0];

  async function run() {
    if (!file) return;
    if (!RANGE_PATTERN.test(pages)) {
      toast.error(t("pdfToImages.badRange"));
      return;
    }
    const outDir = await pickFolder();
    if (!outDir) return;

    const jobId = newJobId();
    const unlisten = await onProgress(jobId, (e) => setProgress({ current: e.current, total: e.total }));
    setBusy(true);
    setProgress({ current: 0, total: file.pages });
    try {
      const res = await pdfToImages(
        file.id,
        { format, dpi: Number(dpi), pages: pages.trim() || null, zip },
        outDir,
        jobId,
      );
      setResult(res);
      toast.success(t("pdfToImages.done", { n: res.count }));
    } catch (e) {
      toast.error(describeError(e, t));
    } finally {
      unlisten();
      setBusy(false);
      setProgress(null);
    }
  }

  function startOver() {
    setResult(null);
    intake.clear();
  }

  if (result) {
    return (
      <ResultPanel filePath={result.zip_path ?? undefined} folderPath={result.out_dir} onStartOver={startOver}>
        <p className="text-center text-sm text-slate-600">
          {result.zip_path
            ? t("pdfToImages.resultZip", { n: result.count })
            : t("pdfToImages.resultFiles", { n: result.count })}
        </p>
      </ResultPanel>
    );
  }

  return (
    <>
      <ProgressOverlay
        visible={busy}
        label={t("pdfToImages.rendering")}
        current={progress?.current}
        total={progress?.total}
      />
      <ToolLayout
        title={t("pdfToImages.title")}
        description={t("pdfToImages.description")}
        icon={<FileImage size={24} />}
        accent="sky"
        sidebar={
          file && (
            <>
              <OptionGroup<OutputFormat>
                label={t("pdfToImages.format")}
                value={format}
                onChange={setFormat}
                options={[
                  { value: "png", label: "PNG" },
                  { value: "jpg", label: "JPG" },
                ]}
              />
              <OptionGroup<DpiChoice>
                label={t("pdfToImages.dpi")}
                value={dpi}
                onChange={setDpi}
                layout="stack"
                options={DPI_CHOICES.map((d) => ({ value: d, label: t(`pdfToImages.dpi.${d}`) }))}
              />
              <label className="flex flex-col gap-1.5">
                <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                  {t("pdfToImages.pages")}
                </span>
                <input
                  type="text"
                  value={pages}
                  onChange={(e) => setPages(e.target.value)}
                  placeholder={t("pdfToImages.pagesPlaceholder")}
                  className="h-10 rounded-lg border border-slate-300 px-3 text-sm focus:border-sky-400 focus:outline-none focus:ring-2 focus:ring-sky-200"
                />
              </label>
              <label className="flex items-center gap-2 text-sm text-slate-700">
                <input
                  type="checkbox"
                  checked={zip}
                  onChange={(e) => setZip(e.target.checked)}
                  className="h-4 w-4 accent-sky-600"
                />
                {t("pdfToImages.zip")}
              </label>
              <Button size="lg" accentBg={PRIMARY} onClick={run} disabled={busy} icon={<FileImage size={18} />}>
                {t("pdfToImages.action")}
              </Button>
            </>
          )
        }
      >
        {!file ? (
          <Dropzone accept={[...ACCEPT]} single isDragging={intake.isDragging} busy={intake.busy} onPick={intake.pick} accent="sky" />
        ) : (
          <div className="flex flex-col gap-4">
            <Dropzone accept={[...ACCEPT]} single isDragging={intake.isDragging} busy={intake.busy} onPick={intake.pick} accent="sky" compact />
            <div className="max-w-xs">
              <FileCard file={file} onRemove={intake.remove} />
            </div>
          </div>
        )}
      </ToolLayout>
    </>
  );
}
