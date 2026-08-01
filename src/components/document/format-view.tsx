import { cn } from "@/lib/utils";
import type { RendererType } from "@/types/document";
import { MarkdownView } from "@/components/markdown/markdown-view";
import {
  isProseRenderer,
  languageFromExtension,
} from "@/lib/documents/formats";
import { PdfViewer } from "./pdf-viewer";
import { ImageView } from "./image-view";

/** Rows a table renders before it turns into a wall of DOM nodes. */
const MAX_CSV_ROWS = 500;

/** Server-safe format display for public document pages. */
export function FormatView({
  content,
  rendererType,
  fileExtension,
  sourceFilename,
  html,
  showLineNumbers,
  fileUrl,
  downloadUrl,
  allowDownload = true,
  fileSize,
  className,
}: {
  content: string;
  rendererType: RendererType;
  fileExtension?: string | null;
  sourceFilename?: string | null;
  /** Pre-rendered markdown HTML when renderer is markdown */
  html?: string;
  showLineNumbers?: boolean;
  /** Short-lived signed URL for binary formats (pdf, image) */
  fileUrl?: string | null;
  downloadUrl?: string | null;
  allowDownload?: boolean;
  fileSize?: number | null;
  className?: string;
}) {
  if (isProseRenderer(rendererType) && html) {
    return <MarkdownView html={html} className={className} />;
  }

  if (rendererType === "csv") {
    return <CsvTable content={content} className={className} />;
  }

  if (
    rendererType === "code" ||
    rendererType === "html" ||
    rendererType === "text"
  ) {
    const lang =
      rendererType === "text"
        ? "text"
        : languageFromExtension(fileExtension || "");
    const lines = content.replace(/\n$/, "").split("\n");
    return (
      <div className={cn("overflow-hidden rounded-xl ring-1 ring-stone-200 dark:ring-stone-800", className)}>
        {(sourceFilename || lang !== "text") && (
          <div className="flex items-center justify-between border-b border-stone-100 bg-stone-50 px-4 py-2 text-[11px] text-stone-500 dark:border-stone-800 dark:bg-stone-900">
            <span className="font-medium">{sourceFilename || "Datei"}</span>
            <span className="uppercase tracking-wide">{lang}</span>
          </div>
        )}
        <pre
          className={cn(
            "overflow-x-auto bg-stone-950 p-4 text-[13px] leading-relaxed text-stone-100",
            rendererType === "text" &&
              "bg-white font-sans text-stone-800 dark:bg-stone-950 dark:text-stone-100"
          )}
        >
          <code>
            {lines.map((line, i) => (
              <span key={i} className="block min-h-[1.25em]">
                {showLineNumbers && (
                  <span className="mr-4 inline-block w-8 select-none text-right text-stone-500">
                    {i + 1}
                  </span>
                )}
                {line || " "}
              </span>
            ))}
          </code>
        </pre>
      </div>
    );
  }

  if (rendererType === "pdf" || rendererType === "image") {
    if (!fileUrl) {
      return <MissingFile filename={sourceFilename} className={className} />;
    }
    if (rendererType === "image") {
      return (
        <ImageView
          url={fileUrl}
          filename={sourceFilename}
          allowDownload={allowDownload}
          downloadUrl={downloadUrl}
          className={className}
        />
      );
    }
    return (
      <PdfViewer
        url={fileUrl}
        filename={sourceFilename}
        fileSize={fileSize}
        allowDownload={allowDownload}
        downloadUrl={downloadUrl}
        className={className}
      />
    );
  }

  if (!content.trim()) {
    return <MissingFile filename={sourceFilename} className={className} />;
  }

  // fallback markdown-ish
  return (
    <div
      className={cn(
        "prose prose-stone max-w-none whitespace-pre-wrap text-[15px] leading-relaxed",
        className
      )}
    >
      {content}
    </div>
  );
}

function MissingFile({
  filename,
  className,
}: {
  filename?: string | null;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "rounded-xl border border-dashed border-stone-200 p-10 text-center text-[14px] text-stone-500 dark:border-stone-700",
        className
      )}
    >
      Diese Datei ist derzeit nicht verfügbar.
      {filename && (
        <p className="mt-2 font-medium text-stone-700 dark:text-stone-200">
          {filename}
        </p>
      )}
    </div>
  );
}

function CsvTable({
  content,
  className,
}: {
  content: string;
  className?: string;
}) {
  const lines = content.trim().split(/\r?\n/).filter(Boolean);
  if (lines.length === 0) {
    return <p className="text-sm text-stone-400">Leere Tabelle</p>;
  }
  // ponytail: a big table is truncated instead of streamed — paging belongs in
  // the reader UI, not in a render path that would have to hold every row.
  const truncated = lines.length - 1 > MAX_CSV_ROWS;
  const rows = lines
    .slice(0, MAX_CSV_ROWS + 1)
    .map((line) => parseCsvLine(line));
  const header = rows[0];
  const body = rows.slice(1);

  return (
    <div
      className={cn(
        "overflow-x-auto rounded-xl ring-1 ring-stone-200 dark:ring-stone-800",
        className
      )}
    >
      <table className="w-full min-w-[480px] border-collapse text-left text-[13px]">
        <thead>
          <tr className="bg-stone-50 dark:bg-stone-900">
            {header.map((cell, i) => (
              <th
                key={i}
                className="sticky top-0 border-b border-stone-200 px-3 py-2 font-semibold text-stone-700 dark:border-stone-700 dark:text-stone-200"
              >
                {cell}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {body.map((row, ri) => (
            <tr
              key={ri}
              className="border-b border-stone-100 odd:bg-white even:bg-stone-50/50 dark:border-stone-800 dark:odd:bg-stone-950 dark:even:bg-stone-900/40"
            >
              {header.map((_, ci) => (
                <td
                  key={ci}
                  className="px-3 py-2 text-stone-600 dark:text-stone-300"
                >
                  {row[ci] ?? ""}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
      {truncated && (
        <p className="border-t border-stone-100 px-3 py-2 text-[12px] text-stone-400 dark:border-stone-800">
          Nur die ersten {MAX_CSV_ROWS.toLocaleString("de-DE")} Zeilen werden
          angezeigt. Die vollständige Datei steht zum Download bereit.
        </p>
      )}
    </div>
  );
}

function parseCsvLine(line: string): string[] {
  const out: string[] = [];
  let cur = "";
  let inQ = false;
  for (let i = 0; i < line.length; i++) {
    const c = line[i];
    if (c === '"') {
      if (inQ && line[i + 1] === '"') {
        cur += '"';
        i++;
      } else inQ = !inQ;
    } else if (c === "," && !inQ) {
      out.push(cur);
      cur = "";
    } else cur += c;
  }
  out.push(cur);
  return out;
}
