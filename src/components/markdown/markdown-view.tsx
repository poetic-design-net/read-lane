import { cn } from "@/lib/utils";
import type { ContentWidth, FontStyle } from "@/types/document";

const widthClass: Record<ContentWidth, string> = {
  narrow: "max-w-2xl",
  normal: "max-w-3xl",
  wide: "max-w-5xl",
};

interface MarkdownViewProps {
  html: string;
  contentWidth?: ContentWidth;
  fontStyle?: FontStyle;
  className?: string;
}

export function MarkdownView({
  html,
  contentWidth = "normal",
  fontStyle = "sans",
  className,
}: MarkdownViewProps) {
  return (
    <div
      className={cn(
        "md-prose w-full",
        widthClass[contentWidth],
        fontStyle === "serif" ? "font-serif" : "font-sans",
        className
      )}
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}
