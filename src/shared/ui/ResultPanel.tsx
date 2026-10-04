import { useState, type ReactNode } from "react";
import {
  ArrowRight,
  CheckCircle2,
  Download,
  ExternalLink,
  FolderDown,
  FolderOpen,
  RotateCcw,
  Share2,
  type LucideIcon,
} from "lucide-react";
import { accentClasses, type Accent } from "@/shared/lib/colors";
import { openOutput, revealOutput } from "@/shared/files/ipc";
import { useT } from "@/shared/i18n/useT";
import { describeError } from "@/shared/i18n/errors";
import { useToast } from "@/shared/ui/Toast";
import { isMobile } from "@/shared/platform";
import { saveOutputAs, saveOutputsToDownloads, shareOutputs } from "@/shared/platform/outputs";
import { isIpcError } from "@/shared/ipc/invoke";
import { baseName, parentDir } from "@/shared/lib/format";
import { Button } from "./Button";

/** Tombol "Lanjutkan ke …" menuju alat lain. */
export interface ResultAction {
  id: string;
  label: string;
  icon: LucideIcon;
  accent: Accent;
  onClick: () => void;
}

interface Props {
  title?: string;
  /** Daftar path semua file hasil (dipakai untuk aksi simpan/bagikan di mobile & desktop). */
  outputs?: string[];
  /** Aksi lanjutan (handoff ke alat lain). */
  nextActions?: ResultAction[];
  /** Path file hasil (tombol "Buka file" + "Buka folder" pada desktop). */
  filePath?: string;
  /** Path folder hasil (bila tidak ada satu file utama pada desktop). */
  folderPath?: string;
  onStartOver: () => void;
  children?: ReactNode;
}

/** Panel hasil yang seragam untuk semua alat (desktop & mobile). */
export function ResultPanel({
  title,
  outputs,
  filePath,
  folderPath,
  onStartOver,
  nextActions,
  children,
}: Props) {
  const { t } = useT();
  const toast = useToast();
  const [busyAction, setBusyAction] = useState<string | null>(null);
  const [savedLocation, setSavedLocation] = useState<string | null>(null);

  // Normalisasi daftar output file
  const fileList = outputs ?? (filePath ? [filePath] : []);
  const effectiveFilePath = filePath ?? (fileList.length === 1 ? fileList[0] : undefined);
  const effectiveFolderPath = folderPath ?? (fileList.length > 1 ? parentDir(fileList[0]) : undefined);
  const singleFile = fileList.length === 1 ? fileList[0] : null;

  async function guard(action: () => Promise<void>) {
    try {
      await action();
    } catch (e) {
      toast.error(describeError(e, t));
    }
  }

  async function handleSaveToDownloads() {
    if (busyAction || fileList.length === 0) return;
    setBusyAction("downloads");
    try {
      const res = await saveOutputsToDownloads(fileList);
      setSavedLocation(res.location);
      toast.success(t("result.savedToLocation", { location: res.location }));
    } catch (e) {
      if (isIpcError(e) && e.code === "unsupported") {
        if (fileList.length === 1) {
          try {
            const saved = await saveOutputAs(fileList[0], baseName(fileList[0]));
            if (saved) {
              toast.success(t("result.saved"));
            }
          } catch (saveErr) {
            toast.error(describeError(saveErr, t));
          }
        } else {
          toast.info(t("result.useShare"));
        }
      } else {
        toast.error(describeError(e, t));
      }
    } finally {
      setBusyAction(null);
    }
  }

  async function handleShare() {
    if (busyAction || fileList.length === 0) return;
    setBusyAction("share");
    try {
      await shareOutputs(fileList);
    } catch (e) {
      toast.error(describeError(e, t));
    } finally {
      setBusyAction(null);
    }
  }

  async function handleSaveAs() {
    if (busyAction || !singleFile) return;
    setBusyAction("saveAs");
    try {
      const saved = await saveOutputAs(singleFile, baseName(singleFile));
      if (saved) {
        toast.success(t("result.saved"));
      }
    } catch (e) {
      toast.error(describeError(e, t));
    } finally {
      setBusyAction(null);
    }
  }

  async function handleOpenSingle() {
    if (busyAction || !singleFile) return;
    setBusyAction("open");
    try {
      await openOutput(singleFile);
    } catch (e) {
      toast.error(describeError(e, t));
    } finally {
      setBusyAction(null);
    }
  }

  return (
    <div className="mx-auto max-w-2xl rounded-2xl border border-emerald-200 bg-white p-5 sm:p-8 text-center shadow-sm">
      <div className="mx-auto grid h-14 w-14 sm:h-16 sm:w-16 place-items-center rounded-full bg-emerald-50 text-emerald-600">
        <CheckCircle2 size={32} />
      </div>
      <h2 className="mt-4 text-xl sm:text-2xl font-semibold text-slate-900">{title ?? t("result.title")}</h2>

      {/* Info lokasi: desktop menampilkan path sistem berkas; mobile tidak menampilkan path cache mentah */}
      {!isMobile && (effectiveFilePath || effectiveFolderPath) && (
        <p className="mt-2 break-all text-xs sm:text-sm text-slate-500">
          {t("result.savedTo")}: <span className="font-mono text-slate-700 break-all">{effectiveFilePath ?? effectiveFolderPath}</span>
        </p>
      )}
      {isMobile && savedLocation && (
        <p className="mt-2 break-all text-xs sm:text-sm text-slate-500">
          {t("result.savedTo")}: <span className="font-medium text-slate-700 break-all">{savedLocation}</span>
        </p>
      )}
      {isMobile && !savedLocation && singleFile && (
        <p className="mt-2 break-all text-xs sm:text-sm text-slate-600 font-medium break-all">
          {baseName(singleFile)}
        </p>
      )}

      {children && <div className="mt-6 text-left min-w-0 max-w-full overflow-hidden">{children}</div>}

      {!isMobile ? (
        /* Aksi Desktop: Buka file / Buka folder / Mulai lagi */
        <div className="mt-8 flex flex-col sm:flex-row flex-wrap items-stretch sm:items-center justify-center gap-2.5 sm:gap-3">
          {effectiveFilePath && (
            <Button
              className="w-full sm:w-auto"
              accentBg="bg-emerald-600 hover:bg-emerald-700"
              icon={<ExternalLink size={16} />}
              onClick={() => guard(() => openOutput(effectiveFilePath))}
            >
              {t("common.openFile")}
            </Button>
          )}
          {(effectiveFilePath || effectiveFolderPath) && (
            <Button
              className="w-full sm:w-auto"
              variant="secondary"
              icon={<FolderOpen size={16} />}
              onClick={() =>
                guard(() =>
                  effectiveFilePath ? revealOutput(effectiveFilePath) : openOutput(effectiveFolderPath as string),
                )
              }
            >
              {t("common.openFolder")}
            </Button>
          )}
          <Button className="w-full sm:w-auto" variant="ghost" icon={<RotateCcw size={16} />} onClick={onStartOver}>
            {t("common.startOver")}
          </Button>
        </div>
      ) : (
        /* Aksi Mobile: Simpan ke Unduhan (utama) / Bagikan / Simpan ke... / Buka / Mulai lagi */
        <div className="mt-8 flex flex-col sm:flex-row flex-wrap items-stretch sm:items-center justify-center gap-2.5 sm:gap-3">
          {fileList.length > 0 && (
            <Button
              className="w-full sm:w-auto"
              accentBg="bg-emerald-600 hover:bg-emerald-700"
              icon={<Download size={16} />}
              loading={busyAction === "downloads"}
              disabled={busyAction !== null}
              onClick={handleSaveToDownloads}
            >
              {t("result.saveDownloads")}
            </Button>
          )}
          {fileList.length > 0 && (
            <Button
              className="w-full sm:w-auto"
              variant="secondary"
              icon={<Share2 size={16} />}
              loading={busyAction === "share"}
              disabled={busyAction !== null}
              onClick={handleShare}
            >
              {t("common.share")}
            </Button>
          )}
          {singleFile && (
            <Button
              className="w-full sm:w-auto"
              variant="secondary"
              icon={<FolderDown size={16} />}
              loading={busyAction === "saveAs"}
              disabled={busyAction !== null}
              onClick={handleSaveAs}
            >
              {t("common.saveTo")}
            </Button>
          )}
          {singleFile && (
            <Button
              className="w-full sm:w-auto"
              variant="secondary"
              icon={<ExternalLink size={16} />}
              loading={busyAction === "open"}
              disabled={busyAction !== null}
              onClick={handleOpenSingle}
            >
              {t("result.open")}
            </Button>
          )}
          <Button
            className="w-full sm:w-auto"
            variant="ghost"
            icon={<RotateCcw size={16} />}
            disabled={busyAction !== null}
            onClick={onStartOver}
          >
            {t("common.startOver")}
          </Button>
        </div>
      )}

      {nextActions && nextActions.length > 0 && (
        <div className="mt-8 border-t border-slate-100 pt-6">
          <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-slate-500">{t("handoff.title")}</p>
          <div className="flex flex-col sm:flex-row flex-wrap justify-center gap-2">
            {nextActions.map((action) => {
              const a = accentClasses(action.accent);
              const Icon = action.icon;
              return (
                <button
                  key={action.id}
                  type="button"
                  disabled={busyAction !== null}
                  onClick={action.onClick}
                  className={`inline-flex w-full sm:w-auto items-center justify-center gap-2 rounded-lg border ${a.border} ${a.softBg} px-3 py-2 text-sm font-medium ${a.textStrong} transition hover:brightness-95 disabled:opacity-50`}
                >
                  <Icon size={16} />
                  {action.label}
                  <ArrowRight size={14} />
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
