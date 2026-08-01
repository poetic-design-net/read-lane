"use client";

import { useState } from "react";
import { toast } from "sonner";
import { FolderPlus, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { EXAMPLE_DOCUMENTS, type ExampleDocument } from "@/lib/examples/catalog";
import { useFileIntake, type IntakeResult } from "./use-file-intake";
import type { PlanId } from "@/lib/plans/config";
import { cn } from "@/lib/utils";

/**
 * Loads one example into the editor so a new user can see what a format looks
 * like. Nothing is published — the example is a draft like any other, and it
 * only exists once the user hits publish.
 */
export function ExamplePicker({
  plan,
  onLoad,
}: {
  plan: PlanId;
  onLoad: (example: ExampleDocument, upload: IntakeResult | null) => void;
}) {
  const { pickFile } = useFileIntake(plan);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState<string | null>(null);

  async function choose(example: ExampleDocument) {
    if (loading) return;
    setLoading(example.id);
    try {
      // Binary formats have no text to paste — they take the normal upload
      // route so the editor can preview them before anything is published.
      const upload = example.url
        ? await pickFile(
            await fetch(example.url)
              .then((res) => res.blob())
              .then(
                (blob) =>
                  new File([blob], example.filename, { type: blob.type })
              )
          )
        : null;
      if (example.url && !upload) return;

      onLoad(example, upload);
      setOpen(false);
    } catch {
      toast.error(`${example.label} konnte nicht geladen werden`);
    } finally {
      setLoading(null);
    }
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger
        render={
          <Button size="sm" variant="outline" className="h-9 rounded-full" />
        }
      >
        <FolderPlus data-icon="inline-start" />
        Beispiel laden
      </PopoverTrigger>
      <PopoverContent align="start" className="w-[300px] p-1.5">
        <p className="px-2.5 pb-1 pt-2 text-[11px] uppercase tracking-[0.1em] text-stone-400">
          Format ansehen
        </p>
        <ul className="max-h-[380px] overflow-y-auto">
          {EXAMPLE_DOCUMENTS.map((example) => (
            <li key={example.id}>
              <button
                type="button"
                disabled={loading !== null}
                onClick={() => void choose(example)}
                className={cn(
                  "flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-left transition",
                  "hover:bg-stone-50 disabled:opacity-60 dark:hover:bg-stone-900"
                )}
              >
                <span className="flex size-4 items-center justify-center">
                  {loading === example.id && (
                    <Loader2 className="size-3.5 animate-spin text-stone-400" />
                  )}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-[13px] font-medium text-stone-800 dark:text-stone-100">
                    {example.label}
                  </span>
                  <span className="block text-[11px] text-stone-400">
                    {example.hint}
                  </span>
                </span>
              </button>
            </li>
          ))}
        </ul>
        <p className="border-t border-stone-100 px-2.5 py-2 text-[11px] text-stone-400 dark:border-stone-800">
          Wird nur im Editor geladen, nicht veröffentlicht.
        </p>
      </PopoverContent>
    </Popover>
  );
}
