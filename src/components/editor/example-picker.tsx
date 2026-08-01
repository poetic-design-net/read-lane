"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Check, FolderPlus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { EXAMPLE_DOCUMENTS, type ExampleDocument } from "@/lib/examples/catalog";
import { publishDocumentAction } from "@/app/actions/documents";
import { useFileIntake, type IntakeResult } from "./use-file-intake";
import type { PlanId } from "@/lib/plans/config";
import { cn } from "@/lib/utils";

/**
 * Pick one example per format. Paid plans may load several at once — each
 * becomes its own document. Free has a single slot, so its pick goes into the
 * editor instead of being published.
 */
export function ExamplePicker({
  plan,
  projectId,
  onLoadSingle,
}: {
  plan: PlanId;
  projectId?: string | null;
  /** Free tier: hand the example to the editor rather than publishing it. */
  onLoadSingle: (example: ExampleDocument, upload: IntakeResult | null) => void;
}) {
  const router = useRouter();
  const { pickFile } = useFileIntake(plan);
  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const multi = plan !== "free";

  function toggle(id: string) {
    setSelected((current) => {
      if (!multi) return current.includes(id) ? [] : [id];
      return current.includes(id)
        ? current.filter((x) => x !== id)
        : [...current, id];
    });
  }

  /** Binary examples take the normal upload route — same checks as a real file. */
  async function upload(example: ExampleDocument): Promise<IntakeResult | null> {
    const res = await fetch(example.url!);
    if (!res.ok) throw new Error(example.filename);
    const blob = await res.blob();
    return pickFile(new File([blob], example.filename, { type: blob.type }));
  }

  async function load() {
    const chosen = EXAMPLE_DOCUMENTS.filter((e) => selected.includes(e.id));
    if (chosen.length === 0) return;
    setBusy(true);
    try {
      if (!multi) {
        const example = chosen[0]!;
        const intake = example.url ? await upload(example) : null;
        if (example.url && !intake) return;
        onLoadSingle(example, intake);
        setOpen(false);
        return;
      }

      let created = 0;
      for (const example of chosen) {
        const intake = example.url ? await upload(example) : null;
        if (example.url && !intake) continue;

        const res = await publishDocumentAction({
          title: example.title,
          markdownContent: intake?.markdownContent ?? example.content ?? "",
          visibility: "unlisted",
          status: "published",
          rendererType: example.rendererType,
          fileId: intake?.fileId ?? null,
          sourceFilename: example.filename,
          projectId: projectId ?? null,
        });
        if (!res.ok) {
          toast.error(`${example.label}: ${res.error}`);
          continue;
        }
        created += 1;
      }

      if (created > 0) {
        toast.success(
          created === 1
            ? "Beispiel angelegt"
            : `${created} Beispiele angelegt`
        );
        setSelected([]);
        setOpen(false);
        router.refresh();
      }
    } catch {
      toast.error("Beispiel konnte nicht geladen werden");
    } finally {
      setBusy(false);
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
      <PopoverContent align="start" className="w-[320px] p-1.5">
        <p className="px-2.5 pb-1 pt-2 text-[11px] uppercase tracking-[0.1em] text-stone-400">
          {multi ? "Formate auswählen" : "Format auswählen"}
        </p>
        <ul className="max-h-[380px] overflow-y-auto">
          {EXAMPLE_DOCUMENTS.map((example) => {
            const active = selected.includes(example.id);
            return (
              <li key={example.id}>
                <button
                  type="button"
                  onClick={() => toggle(example.id)}
                  className={cn(
                    "flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-left transition",
                    active
                      ? "bg-stone-100 dark:bg-stone-800"
                      : "hover:bg-stone-50 dark:hover:bg-stone-900"
                  )}
                >
                  {multi ? (
                    <Checkbox checked={active} tabIndex={-1} />
                  ) : (
                    <span className="flex size-4 items-center justify-center">
                      {active && <Check className="size-3.5" />}
                    </span>
                  )}
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
            );
          })}
        </ul>
        <div className="flex items-center justify-between gap-2 border-t border-stone-100 px-2.5 py-2 dark:border-stone-800">
          <span className="text-[11px] text-stone-400">
            {multi
              ? selected.length > 0
                ? `${selected.length} ausgewählt`
                : "Mehrfachauswahl möglich"
              : "Free: ein Dokument"}
          </span>
          <Button
            size="sm"
            className="h-8 rounded-full"
            disabled={busy || selected.length === 0}
            onClick={() => void load()}
          >
            {busy ? "Lädt…" : "Laden"}
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  );
}
