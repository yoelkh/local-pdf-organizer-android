import { useState } from "react";
import { Layers } from "lucide-react";
import { useFileIntake } from "@/shared/files/useFileIntake";
import { pickSavePath } from "@/shared/files/dialogs";
import { useT } from "@/shared/i18n/useT";
import { describeError } from "@/shared/i18n/errors";
import type { OutputInfo } from "@/shared/ipc/types";
import { formatBytes, stripExtension } from "@/shared/lib/format";
import { Button } from "@/shared/ui/Button";
import { Dropzone } from "@/shared/ui/Dropzone";
import { FileCard } from "@/shared/ui/FileCard";
import { ProgressOverlay } from "@/shared/ui/ProgressOverlay";
import { ResultPanel } from "@/shared/ui/ResultPanel";
import { SortableGrid } from "@/shared/ui/SortableGrid";
import { useToast } from "@/shared/ui/Toast";
import { ToolLayout } from "@/shared/ui/ToolLayout";
import { mergePdfs } from "./ipc";

const ACCEPT = ["pdf"] as const;

export function MergePage() {
  const { t } = useT();
  const toast = useToast();
  const intake = useFileIntake({ accept: [...ACCEPT] });
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<OutputInfo | null>(null);

  const totalPages = intake.files.reduce((sum, f) => sum + f.pages, 0);
  const canMerge = intake.files.length >= 2 && !busy;

  async function run() {
    if (intake.files.length < 2) {
      toast.info(t("merge.needTwo"));
      return;
    }
    const first = stripExtension(intake.files[0].name);
    const outPath = await pickSavePath(`${first}_${t("merge.defaultName")}.pdf`, "pdf");
    if (!outPath) return;

    setBusy(true);
    try {
      const info = await mergePdfs(intake.files.map((f) => f.id), outPath);
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

  const hasFiles = intake.files.length > 0;

  return (
    <>
      <ProgressOverlay visible={busy} label={t("common.processing")} />
      <ToolLayout
        title={t("merge.title")}
        description={t("merge.description")}
        icon={<Layers size={24} />}
        accent="rose"
        sidebar={
          hasFiles && (
            <>
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                  {t("common.result")}
                </p>
                <p className="mt-1 text-sm text-slate-700">
                  {t("merge.summary", { files: intake.files.length, pages: totalPages })}
                </p>
              </div>
              <p className="text-xs text-slate-500">{t("merge.hint")}</p>
              <Button size="lg" onClick={run} disabled={!canMerge} icon={<Layers size={18} />}>
                {t("merge.action")}
              </Button>
              <Button variant="ghost" size="sm" onClick={intake.clear}>
                {t("common.clear")}
              </Button>
            </>
          )
        }
      >
        {!hasFiles ? (
          <Dropzone
            accept={[...ACCEPT]}
            isDragging={intake.isDragging}
            busy={intake.busy}
            onPick={intake.pick}
            accent="rose"
          />
        ) : (
          <div className="flex flex-col gap-4">
            <Dropzone
              accept={[...ACCEPT]}
              isDragging={intake.isDragging}
              busy={intake.busy}
              onPick={intake.pick}
              accent="rose"
              compact
            />
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
