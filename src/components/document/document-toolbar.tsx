"use client";

import { CopyButton } from "@/components/editor/copy-button";
import { ThemeToggle } from "@/components/theme/theme-toggle";

export function DocumentToolbar({ shareUrl }: { shareUrl: string }) {
  return (
    <div className="flex items-center gap-1.5">
      <CopyButton value={shareUrl} label="Link kopieren" />
      <ThemeToggle />
    </div>
  );
}
