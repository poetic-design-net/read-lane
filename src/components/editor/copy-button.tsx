"use client";

import { useState } from "react";
import { Check, Copy } from "lucide-react";
import { Button } from "@/components/ui/button";

export function CopyButton({
  value,
  label = "Kopieren",
}: {
  value: string;
  label?: string;
}) {
  const [copied, setCopied] = useState(false);

  async function onCopy(e?: React.MouseEvent) {
    e?.preventDefault();
    e?.stopPropagation();
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // ignore
    }
  }

  if (!label) {
    return (
      <Button
        type="button"
        variant="ghost"
        size="icon-xs"
        onClick={onCopy}
        aria-label={copied ? "Kopiert" : "Kopieren"}
      >
        {copied ? <Check /> : <Copy />}
      </Button>
    );
  }

  return (
    <Button type="button" variant="outline" size="sm" onClick={onCopy}>
      {copied ? (
        <Check data-icon="inline-start" />
      ) : (
        <Copy data-icon="inline-start" />
      )}
      {copied ? "Kopiert" : label}
    </Button>
  );
}
