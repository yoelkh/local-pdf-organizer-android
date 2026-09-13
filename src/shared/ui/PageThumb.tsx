import { useEffect, useState } from "react";
import { FileText, ImageOff } from "lucide-react";
import { thumbnailUrl } from "@/shared/files/thumbnails";

interface Props {
  fileId: string;
  /** Indeks halaman 0-based. */
  page?: number;
  /** Lebar render di backend (piksel). */
  width?: number;
  className?: string;
  alt?: string;
}

export function PageThumb({ fileId, page = 0, width = 240, className = "", alt = "" }: Props) {
  const [src, setSrc] = useState<string | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let alive = true;
    setSrc(null);
    setFailed(false);
    thumbnailUrl(fileId, page, width)
      .then((url) => alive && setSrc(url))
      .catch(() => alive && setFailed(true));
    return () => {
      alive = false;
    };
  }, [fileId, page, width]);

  if (failed) {
    return (
      <div className={`grid place-items-center bg-slate-100 text-slate-400 ${className}`}>
        <ImageOff size={24} />
      </div>
    );
  }
  if (!src) {
    return (
      <div className={`grid animate-pulse place-items-center bg-slate-100 text-slate-300 ${className}`}>
        <FileText size={24} />
      </div>
    );
  }
  return <img src={src} alt={alt} draggable={false} className={`object-contain ${className}`} />;
}
