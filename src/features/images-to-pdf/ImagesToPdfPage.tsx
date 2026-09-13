import { useState } from "react";
import { Images } from "lucide-react";
import { useFileIntake } from "@/shared/files/useFileIntake";
import { pickSavePath } from "@/shared/files/dialogs";
import { useT } from "@/shared/i18n/useT";
import { describeError } from "@/shared/i18n/errors";
import type { OutputInfo } from "@/shared/ipc/types";
import { formatBytes, stripExtension } from "@/shared/lib/format";
import { Button } from "@/shared/ui/Button";
import { Dropzone } from "@/shared/ui/Dropzone";
import { FileCard } from "@/shared/ui/FileCard";
import { OptionGroup } from "@/shared/ui/OptionGroup";
import { ProgressOverlay } from "@/shared/ui/ProgressOverlay";
import { ResultPanel } from "@/shared/ui/ResultPanel";
import { SortableGrid } from "@/shared/ui/SortableGrid";
import { useToast } from "@/shared/ui/Toast";
import { ToolLayout } from "@/shared/ui/ToolLayout";
import { imagesToPdf, type ImagesToPdfOptions, type Margin, type Orientation, type PageSizeOption } from "./ipc";

const ACCEPT = ["image"] as const;
const PRIMARY = "bg-amber-500 hover:bg-amber-600";

export function ImagesToPdfPage() {
  const { t } = useT();
  const toast = useToast();
  const intake = useFileIntake({ accept: [...ACCEPT] });
  const [options, setOptions] = useState<ImagesToPdfOptions>({
    page_size: "fit",
    orientation: "auto",
    margin: "none",
  });
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<OutputInfo | null>(null);

  const hasFiles = intake.files.length > 0;

  async function run() {
    const first = stripExtension(intake.files[0].name);
    const outPath = await pickSavePath(`${first}_${t("imagesToPdf.defaultName")}.pdf`, "pdf");
    if (!outPath) return;

    setBusy(true);
    try {
      const info = await imagesToPdf(intake.files.map((f) => f.id), options, outPath);
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
      <ResultPanel filePath={result.path} onStartOver={startOver}>
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
                value={options.page_size}
                onChange={(page_size) => setOptions((o) => ({ ...o, page_size }))}
                options={[
                  { value: "fit", label: t("imagesToPdf.size.fit") },
                  { value: "a4", label: t("imagesToPdf.size.a4") },
                  { value: "letter", label: t("imagesToPdf.size.letter") },
                ]}
              />
              <OptionGroup<Orientation>
                label={t("imagesToPdf.orientation")}
                value={options.orientation}
                disabled={!fixedSize}
                onChange={(orientation) => setOptions((o) => ({ ...o, orientation }))}
                options={[
                  { value: "auto", label: t("imagesToPdf.orient.auto") },
                  { value: "portrait", label: t("imagesToPdf.orient.portrait") },
                  { value: "landscape", label: t("imagesToPdf.orient.landscape") },
                ]}
              />
              <OptionGroup<Margin>
                label={t("imagesToPdf.margin")}
                value={options.margin}
                onChange={(margin) => setOptions((o) => ({ ...o, margin }))}
                options={[
                  { value: "none", label: t("imagesToPdf.margin.none") },
                  { value: "small", label: t("imagesToPdf.margin.small") },
                  { value: "big", label: t("imagesToPdf.margin.big") },
                ]}
              />
              <p className="text-xs text-slate-500">{t("imagesToPdf.hint")}</p>
              <Button size="lg" accentBg={PRIMARY} onClick={run} disabled={busy} icon={<Images size={18} />}>
                {t("imagesToPdf.action")}
              </Button>
              <Button variant="ghost" size="sm" onClick={intake.clear}>
                {t("common.clear")}
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
            <SortableGrid
              items={intake.files}
              getId={(f) => f.id}
              onReorder={intake.reorder}
              className="grid gap-4 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4"
              renderItem={(file, index, { isDragging }) => (
                <FileCard file={file} index={index} onRemove={intake.remove} isDragging={isDragging} />
              )}
            />
          </div>
        )}
      </ToolLayout>
    </>
  );
}
