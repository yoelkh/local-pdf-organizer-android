import type { Dictionary } from "./LanguageProvider";

export const baseEn: Dictionary = {
  "app.name": "Local PDF Organizer",

  "home.title": "Every PDF tool you need, fully offline",
  "home.subtitle":
    "Merge, reorder, convert, and compress PDFs right on this PC. No file ever leaves your computer.",

  "common.pickFiles": "Select files",
  "common.addMore": "Add files",
  "common.remove": "Remove",
  "common.clear": "Clear",
  "common.startOver": "Start over",
  "common.openFile": "Open file",
  "common.openFolder": "Open folder",
  "common.processing": "Processing...",
  "common.pages": "{n} pages",
  "common.page": "Page {n}",
  "common.rotate": "Rotate 90°",
  "common.selectAll": "Select all",
  "common.deselect": "Deselect",
  "common.deleteSelected": "Delete selected ({n})",
  "common.reset": "Reset",
  "common.result": "Result",

  "dropzone.pdf": "Drop PDF files here",
  "dropzone.pdfSingle": "Drop one PDF file here",
  "dropzone.image": "Drop images here",
  "dropzone.orClick": "or click the button to browse your computer",
  "dropzone.dropNow": "Release to add",
  "dropzone.formats.pdf": "Formats: PDF",
  "dropzone.formats.image": "Formats: JPG, PNG, WebP, BMP, GIF, TIFF",

  "intake.skippedType": "{n} file(s) skipped because this tool does not accept that type.",
  "intake.skippedFile": "Could not read {name}.",

  "view.open": "View full size",
  "view.thumbSize": "Thumbnail size",
  "view.smaller": "Smaller thumbnails",
  "view.larger": "Larger thumbnails",
  "view.hintFiles": "Drag cards to reorder · double-click or the eye icon to look inside.",
  "view.hintFilesPlain": "Double-click or use the eye icon to look inside a file.",

  "viewer.position": "{n} of {total}",
  "viewer.pageOf": "Page {n} / {total}",
  "viewer.prev": "Previous (left arrow)",
  "viewer.next": "Next (right arrow)",
  "viewer.zoomIn": "Zoom in (+)",
  "viewer.zoomOut": "Zoom out (-)",
  "viewer.fit": "Fit to screen (0)",
  "viewer.close": "Close (Esc)",
  "viewer.failed": "This page could not be displayed.",
  "viewer.hint": "Left/right arrows: change page · + / -: zoom · 0: fit · Esc: close",
  "viewer.hintEdit": "Left/right arrows: change page · + / -: zoom · 0: fit · R: rotate · Del: delete · Esc: close",

  "board.selected": "{n} selected",
  "board.rotateSelected": "Rotate selected",
  "board.moveEarlier": "Move earlier",
  "board.moveLater": "Move later",

  "handoff.title": "Continue with this result",
  "handoff.continueTo": "Continue to {tool}",

  "result.title": "Done!",
  "result.savedTo": "Saved to",

  "error.io": "Failed to read or write the file.",
  "error.not_found": "File not found. It may have been moved or deleted.",
  "error.unsupported": "Unsupported file format (encrypted PDFs are not supported yet).",
  "error.invalid_input": "Invalid input.",
  "error.pdf": "The PDF could not be processed. It may be corrupted.",
  "error.image": "The image could not be processed.",
  "error.engine": "The PDF engine is unavailable.",
  "error.internal": "An unexpected error occurred.",
  "error.detail": "Details",
};
