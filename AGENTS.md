# Agent rules — Local PDF Organizer

You are one member of a multi-agent team. A lead (orchestrator) assigns you a brief, audits your diff,
and integrates. Other agents edit this same working tree at the same time, so stay inside your brief.

## Project

Offline PDF toolkit (merge, organize pages, images → PDF, PDF → images, compress).
Tauri 2 app: Rust backend in `src-tauri/`, React 19 + TypeScript + Tailwind 4 frontend in `src/`.
Desktop (Windows) ships today; branch `android` adds an Android target from the same codebase.

Read before coding: `docs/ARCHITECTURE.md`, `docs/ADDING_A_FEATURE.md`, and `docs/android/PLAN.md`.

## Hard rules

1. **File ownership.** Only create or edit files listed under "You own" in your brief. If you need a
   change elsewhere, do not make it: describe it under `NEEDS` in your report.
2. **Never break desktop.** Android-only code is gated (`#[cfg(target_os = "android")]`, `cfg(mobile)`,
   or a runtime platform check on the frontend). Desktop behavior must stay identical.
3. **Modularity.** Features never import each other. Shared code lives in `src/shared` (TS) or
   `src-tauri/src/core` (Rust). `npm run lint:deps` must stay green.
4. **No git writes.** Do not run `git add/commit/push/checkout/stash/reset/restore/clean`. Reading
   (`git status`, `git diff`, `git log`) is fine. The lead handles version control.
5. **No device access** (`adb`, emulator, `tauri android dev/run`) unless your brief says so.
6. **No global changes.** Do not edit system environment variables, global configs, `~/.gemini`,
   or install global tools. Project-local installs (npm/cargo deps) only when your brief needs them.
7. **No new dependencies** unless your brief allows it; otherwise list it under `NEEDS`.
8. **Do not weaken checks.** Never delete or loosen tests, lint rules, or type checks to get green.
9. **Verify facts in source.** When unsure about an API, read the actual code in
   `node_modules/` or `~/.cargo/registry/src/` instead of guessing. Say what you verified.

## Conventions

- Code comments and doc comments are in **Indonesian**, matching the existing code. Identifiers in English.
- UI text goes through i18n with **both** `id` and `en` keys (`src/shared/i18n/base.*.ts` for shared
  text, `src/features/<tool>/i18n.ts` for tool text). No hardcoded user-visible strings.
- TypeScript is strict (`noUnusedLocals`, `noUnusedParameters`). Path alias `@/` = `src/`.
- Tailwind classes must be literal strings (no dynamic class construction); see `src/shared/lib/colors.ts`.
- Rust: errors use `AppError` (`core/error.rs`); no `unwrap()` in commands; PDFium calls only via the
  worker thread (`core/pdf/engine/worker.rs`).
- Tauri command args are camelCase on the JS side (`out_path` → `outPath`); struct fields follow serde.

## Environment (Windows)

- Shell is PowerShell. Rust lives in `%USERPROFILE%\.cargo\bin`.
- Android env is **not** set globally. For Android commands, first dot-source the project script in
  the same shell: `. .\scripts\android-env.ps1` (sets `ANDROID_HOME`, `NDK_HOME`, `JAVA_HOME`, `PATH`).

## Checks (run the ones your brief lists; paste the real result lines in your report)

| Check | Command | Where |
|---|---|---|
| Types + frontend build | `npm run build` | repo root |
| Feature import rule | `npm run lint:deps` | repo root |
| Rust desktop compile | `cargo check` | `src-tauri` |
| Rust tests | `cargo test` | `src-tauri` |
| Rust Android compile | `cargo check --target aarch64-linux-android --lib` (after `android-env.ps1`) | `src-tauri` |

## Report format (your final message)

```
STATUS: done | partial | blocked
SUMMARY: 2-5 lines on what you built and why it is correct.
FILES: path — one line each (created/modified).
CHECKS: each command you ran and its real outcome (pass/fail + key line).
VERIFIED: API facts you confirmed in source, with file paths.
NEEDS: changes required outside your files, for the lead to route (or "none").
RISKS: anything you could not verify, with how to verify it.
```

Be honest in the report: an accurate "partial" is worth more than an optimistic "done".
