import { Download } from "lucide-react";
import { cn } from "@/lib/utils";

/** Image page — click opens the full-size file in a new tab. */
export function ImageView({
  url,
  filename,
  allowDownload = true,
  downloadUrl,
  className,
}: {
  url: string;
  filename?: string | null;
  allowDownload?: boolean;
  downloadUrl?: string | null;
  className?: string;
}) {
  return (
    <figure className={cn("flex flex-col items-center gap-3", className)}>
      <a
        href={url}
        target="_blank"
        rel="noopener noreferrer"
        className="block max-w-full rounded-xl bg-stone-50 p-2 ring-1 ring-stone-200 dark:bg-stone-900 dark:ring-stone-800"
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={url}
          alt={filename || "Bild"}
          className="mx-auto max-h-[70vh] max-w-full rounded-lg object-contain"
        />
      </a>
      <figcaption className="flex items-center gap-3 text-[12px] text-stone-400">
        <span className="truncate">{filename || "Bild"}</span>
        {allowDownload && downloadUrl && (
          <a
            href={downloadUrl}
            className="inline-flex items-center gap-1 text-stone-500 hover:text-stone-800 dark:hover:text-stone-100"
          >
            <Download className="size-3.5" />
            Download
          </a>
        )}
      </figcaption>
    </figure>
  );
}
