"use client";

import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import rehypeSanitize from "rehype-sanitize";
import { markdownSanitizeSchema } from "@/lib/markdown/sanitize-schema";
import { cn } from "@/lib/utils";
import type { ContentWidth, FontStyle } from "@/types/document";

const widthClass: Record<ContentWidth, string> = {
  narrow: "max-w-2xl",
  normal: "max-w-3xl",
  wide: "max-w-5xl",
};

interface LivePreviewProps {
  markdown: string;
  contentWidth?: ContentWidth;
  fontStyle?: FontStyle;
  className?: string;
}

export function LivePreview({
  markdown,
  contentWidth = "normal",
  fontStyle = "sans",
  className,
}: LivePreviewProps) {
  if (!markdown.trim()) {
    return (
      <div className={cn("p-6 text-muted-foreground text-sm", className)}>
        Die Vorschau erscheint, sobald Sie Markdown eingeben oder eine Datei
        hochladen.
      </div>
    );
  }

  return (
    <div
      className={cn(
        "md-prose w-full p-4 sm:p-6",
        widthClass[contentWidth],
        fontStyle === "serif" ? "font-serif" : "font-sans",
        className
      )}
    >
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        rehypePlugins={[[rehypeSanitize, markdownSanitizeSchema]]}
        components={{
          a: ({ href, children, ...props }) => {
            const safe =
              href &&
              (href.startsWith("http://") ||
                href.startsWith("https://") ||
                href.startsWith("mailto:") ||
                href.startsWith("#"));
            if (!safe) {
              return <span {...props}>{children}</span>;
            }
            return (
              <a href={href} rel="noopener noreferrer" {...props}>
                {children}
              </a>
            );
          },
          img: ({ src, alt, ...props }) => {
            if (
              !src ||
              !(
                String(src).startsWith("http://") ||
                String(src).startsWith("https://")
              )
            ) {
              return null;
            }
            // eslint-disable-next-line @next/next/no-img-element
            return <img src={src} alt={alt ?? ""} loading="lazy" {...props} />;
          },
        }}
      >
        {markdown}
      </ReactMarkdown>
    </div>
  );
}
