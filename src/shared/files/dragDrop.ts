import { useEffect, useRef, useState } from "react";
import { getCurrentWebview } from "@tauri-apps/api/webview";

/**
 * Drop file dari Explorer ke jendela aplikasi. Tauri memberi path absolut,
 * berbeda dari HTML5 drag-drop yang hanya memberi isi file.
 */
export function useFileDrop(onDrop: (paths: string[]) => void): { isDragging: boolean } {
  const [isDragging, setDragging] = useState(false);
  const handler = useRef(onDrop);
  handler.current = onDrop;

  useEffect(() => {
    // Di luar Tauri (mis. dibuka di browser biasa) tidak ada drag-drop native.
    if (!("__TAURI_INTERNALS__" in window)) return;
    let disposed = false;
    const unlisten = getCurrentWebview().onDragDropEvent((event) => {
      const payload = event.payload;
      if (payload.type === "enter" || payload.type === "over") {
        setDragging(true);
      } else if (payload.type === "leave") {
        setDragging(false);
      } else if (payload.type === "drop") {
        setDragging(false);
        if (payload.paths.length > 0) handler.current(payload.paths);
      }
    });
    return () => {
      disposed = true;
      void unlisten.then((fn) => disposed && fn());
    };
  }, []);

  return { isDragging };
}
