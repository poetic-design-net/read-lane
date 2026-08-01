"use client";

import { useEffect, useState } from "react";
import { Download, ExternalLink, FileText } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * PDF display, deliberately isolated behind this component.
 *
 * Uses the browser's built-in viewer via <iframe>, which brings zoom, page
 * navigation, search, print and fullscreen for free. Swapping to PDF.js means
 * replacing the <iframe> below — nothing outside this file needs to change.
 *
 * `url` must be a short-lived signed URL; it is never a permanent file link.
 */
export function PdfViewer({
  url,
  filename,
  fileSize,
  allowDownload = true,
  downloadUrl,
  className,
}: {
  url: string;
  filename?: string | null;
  fileSize?: number | null;
  allowDownload?: boolean;
  downloadUrl?: string | null;
  className?: string;
}) {
  const embedded = useEmbeddedPdfSupport();

  return (
    <div
      className={cn(
        "overflow-hidden rounded-xl ring-1 ring-stone-200 dark:ring-stone-800",
        className
      )}
    >
      <div className="flex items-center justify-between gap-3 border-b border-stone-100 bg-stone-50 px-4 py-2 dark:border-stone-800 dark:bg-stone-900">
        <div className="flex min-w-0 items-center gap-2">
          <FileText className="size-3.5 shrink-0 text-stone-400" />
          <span className="truncate text-[12px] font-medium text-stone-600 dark:text-stone-300">
            {filename || "Dokument.pdf"}
          </span>
          {fileSize ? (
            <span className="shrink-0 text-[11px] text-stone-400">
              {formatBytes(fileSize)}
            </span>
          ) : null}
        </div>
        <div className="flex shrink-0 items-center gap-3">
          <a
            href={url}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 text-[12px] text-stone-500 hover:text-stone-800 dark:hover:text-stone-100"
          >
            <ExternalLink className="size-3.5" />
            Öffnen
          </a>
          {allowDownload && downloadUrl && (
            <a
              href={downloadUrl}
              className="inline-flex items-center gap-1 text-[12px] text-stone-500 hover:text-stone-800 dark:hover:text-stone-100"
            >
              <Download className="size-3.5" />
              Download
            </a>
          )}
        </div>
      </div>

      {embedded === false ? (
        // iOS Safari and most mobile browsers render an empty box instead of a
        // PDF, so offer the tab handoff rather than a blank frame.
        <div className="flex flex-col items-center justify-center gap-3 bg-white px-6 py-12 text-center dark:bg-stone-950">
          <FileText className="size-7 text-stone-300" strokeWidth={1.5} />
          <p className="text-[14px] text-stone-600 dark:text-stone-300">
            PDFs lassen sich auf diesem Gerät nicht direkt einbetten.
          </p>
          <a
            href={url}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex h-9 items-center rounded-full bg-stone-900 px-4 text-[13px] font-medium text-white dark:bg-stone-100 dark:text-stone-900"
          >
            In neuem Tab öffnen
          </a>
        </div>
      ) : (
        <iframe
          src={url}
          title={filename || "PDF-Dokument"}
          className="h-[min(80vh,900px)] w-full border-0 bg-stone-100 dark:bg-stone-900"
        />
      )}
    </div>
  );
}

/**
 * `undefined` until measured, so the first paint is the iframe (correct on
 * desktop) instead of a fallback that flashes away.
 */
function useEmbeddedPdfSupport(): boolean | undefined {
  const [supported, setSupported] = useState<boolean | undefined>(undefined);

  useEffect(() => {
    // navigator.pdfViewerEnabled is the standardized signal; where it is
    // missing, a coarse pointer is the reliable proxy for mobile browsers.
    const nav = navigator as Navigator & { pdfViewerEnabled?: boolean };
    if (typeof nav.pdfViewerEnabled === "boolean") {
      setSupported(nav.pdfViewerEnabled);
      return;
    }
    setSupported(!window.matchMedia("(pointer: coarse)").matches);
  }, []);

  return supported;
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}
