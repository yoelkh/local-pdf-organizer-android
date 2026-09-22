import { useState } from "react";
import { Minimize2 } from "lucide-react";
import { useHandoffActions } from "@/features/handoff";
import { useFileIntake } from "@/shared/files/useFileIntake";
import { pickFolder, pickSavePath } from "@/shared/files/dialogs";
import { useT } from "@/shared/i18n/useT";
import { describeError } from "@/shared/i18n/errors";
import { formatBytes, joinPath, parentDir, savingsPercent, stripExtension } from "@/shared/lib/format";
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
import { compressPdf, type CompressLevel, type CompressResult } from "./ipc";

const ACCEPT = ["pdf"] as const;
const PRIMARY = "bg-emerald-600 hover:bg-emerald-700";
const LEVELS: CompressLevel[] = ["low", "recommended", "extreme"];

export function CompressPage() {
  const { t } = useT();
  const toast = useToast();
  const intake = useFileIntake({ accept: [...ACCEPT] });
  const [level, setLevel] = useState<CompressLevel>("recommended");
  const [busy, setBusy] = useState<{ name: string; current: number; total: number } | null>(null);
  const [results, setResults] = useState<CompressResult[] | null>(null);
  const [viewing, setViewing] = useState<string | null>(null);
  const thumbSize = useThumbSize("compress", 220);
  const nextActions = useHandoffActions("compress", "pdf", results ? results.map((r) => r.path) : []);

  const hasFiles = intake.files.length > 0;

  async function run() {
    const files = intake.files;
    if (files.length === 0) return;

    // Satu file → dialog simpan; banyak file → pilih folder, nama diberi akhiran.
    let targets: { id: string; outPath: string; name: string }[];
    if (files.length === 1) {
      const f = files[0];
      const out = await pickSavePath(`${stripExtension(f.name)}${t("compress.suffix")}.pdf`, "pdf");
      if (!out) return;
      targets = [{ id: f.id, outPath: out, name: f.name }];
    } else {
      const dir = await pickFolder();
      if (!dir) return;
      targets = files.map((f) => ({
        id: f.id,
        outPath: joinPath(dir, `${stripExtension(f.name)}${t("compress.suffix")}.pdf`),
        name: f.name,
      }));
    }

    const done: CompressResult[] = [];
    try {
      for (let i = 0; i < targets.length; i++) {
        const tgt = targets[i];
        setBusy({ name: tgt.name, current: i, total: targets.length });
        done.push(await compressPdf(tgt.id, level, tgt.outPath));
      }
      setResults(done);
      toast.success(t("compress.done", { n: done.length }));
    } catch (e) {
      toast.error(describeError(e, t));
      if (done.length > 0) setResults(done);
    } finally {
      setBusy(null);
    }
  }

  function startOver() {
    setResults(null);
    intake.clear();
  }

  if (results) {
    const before = results.reduce((s, r) => s + r.original_size, 0);
    const after = results.reduce((s, r) => s + r.compressed_size, 0);
    const single = results.length === 1 ? results[0] : null;
    return (
      <ResultPanel
        title={t("compress.resultTitle")}
        filePath={single?.path}
        folderPath={single ? undefined : parentDir(results[0].path)}
        onStartOver={startOver}
        nextActions={nextActions}
      >
        <table className="w-full text-sm">
          <tbody>
            {results.map((r) => {
              const pct = savingsPercent(r.original_size, r.compressed_size);
              return (
                <tr key={r.path} className="border-b border-slate-100 last:border-0">
                  <td className="max-w-[16rem] truncate py-2 pr-3 font-medium text-slate-800" title={r.path}>
                    {r.name}
                  </td>
                  <td className="whitespace-nowrap py-2 pr-3 text-slate-500">
                    {formatBytes(r.original_size)} → {formatBytes(r.compressed_size)}
                  </td>
                  <td className="whitespace-nowrap py-2 text-right">
                    {r.unchanged ? (
                      <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-600">{t("compress.unchanged")}</span>
                    ) : (
                      <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-xs font-semibold text-emerald-700">
                        {t("compress.saved", { pct })}
                      </span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        {results.length > 1 && (
          <p className="mt-3 text-right text-sm font-medium text-slate-700">
            {t("compress.total", { before: formatBytes(before), after: formatBytes(after) })}{" "}
            <span className="text-emerald-700">({t("compress.saved", { pct: savingsPercent(before, after) })})</span>
          </p>
        )}
      </ResultPanel>
    );
  }

  return (
    <>
      <ProgressOverlay
        visible={busy !== null}
        label={busy ? t("compress.working", { name: busy.name }) : ""}
        current={busy && busy.total > 1 ? busy.current : undefined}
        total={busy && busy.total > 1 ? busy.total : undefined}
      />
      <FilePagesViewer files={intake.files} openFileId={viewing} onClose={() => setViewing(null)} onRemoveFile={intake.remove} />
      <ToolLayout
        title={t("compress.title")}
        description={t("compress.description")}
        icon={<Minimize2 size={24} />}
        accent="emerald"
        sidebar={
          hasFiles && (
            <>
              <OptionGroup<CompressLevel>
                label={t("compress.level")}
                accent="emerald"
                value={level}
                onChange={setLevel}
                layout="stack"
                options={LEVELS.map((l) => ({
                  value: l,
                  label: t(`compress.level.${l}`),
                  description: t(`compress.level.${l}.desc`),
                }))}
              />
              <p className="text-xs text-slate-500">{t("compress.note")}</p>
              <Button size="lg" accentBg={PRIMARY} onClick={run} disabled={busy !== null} icon={<Minimize2 size={18} />}>
                {t("compress.action")}
              </Button>
              <Button variant="ghost" size="sm" onClick={intake.clear}>
                {t("common.clear")}
              </Button>
            </>
          )
        }
      >
        {!hasFiles ? (
          <Dropzone accept={[...ACCEPT]} isDragging={intake.isDragging} busy={intake.busy} onPick={intake.pick} accent="emerald" />
        ) : (
          <div className="flex flex-col gap-4">
            <Dropzone accept={[...ACCEPT]} isDragging={intake.isDragging} busy={intake.busy} onPick={intake.pick} accent="emerald" compact />
            <GridToolbar thumbSize={thumbSize}>{t("view.hintFilesPlain")}</GridToolbar>
            <SortableGrid
              items={intake.files}
              getId={(f) => f.id}
              onReorder={intake.reorder}
              className="grid gap-4"
              style={thumbSize.gridStyle}
              renderItem={(file, _index, { isDragging }) => (
                <FileCard file={file} onRemove={intake.remove} onView={setViewing} isDragging={isDragging} thumbWidth={thumbSize.renderWidth} />
              )}
            />
          </div>
        )}
      </ToolLayout>
    </>
  );
}
