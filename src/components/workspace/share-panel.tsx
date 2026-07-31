"use client";

import { Copy, ExternalLink, Link2, Lock, Settings2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import type { Visibility } from "@/types/document";

export function SharePanel({
  shareUrl,
  title,
  isPasswordProtected,
  visibility,
  onClose,
  manageHref,
}: {
  shareUrl: string;
  title?: string;
  isPasswordProtected?: boolean;
  visibility?: Visibility;
  onClose?: () => void;
  manageHref?: string;
}) {
  const passwordRequired =
    isPasswordProtected || visibility === "password";

  async function copy(text: string, label: string) {
    try {
      await navigator.clipboard.writeText(text);
      toast.success(`${label} kopiert`);
    } catch {
      toast.error("Kopieren fehlgeschlagen");
    }
  }

  const accessHint = passwordRequired
    ? "Zusätzlich ist ein Passwort erforderlich."
    : visibility === "unlisted"
      ? "Nur Personen mit diesem Link können die Seite ansehen."
      : "Jeder mit dem Link kann die Seite ansehen.";

  return (
    <div className="w-full rounded-2xl bg-white p-4 shadow-[0_16px_40px_-12px_rgba(15,15,15,0.2)] ring-1 ring-black/[0.06] dark:bg-stone-900 dark:ring-white/10">
      <div className="mb-3 flex items-center justify-between">
        <p className="text-[14px] font-semibold tracking-tight text-stone-800 dark:text-stone-100">
          Teilen
        </p>
        {onClose && (
          <button
            type="button"
            onClick={onClose}
            className="rounded-md p-1 text-stone-400 hover:bg-stone-50 hover:text-stone-600 dark:hover:bg-stone-800"
            aria-label="Schließen"
          >
            <X className="size-4" />
          </button>
        )}
      </div>

      {title && (
        <p className="mb-3 truncate text-[12px] text-stone-400">{title}</p>
      )}

      <div className="mb-4">
        <p className="mb-1.5 text-[11px] font-medium text-stone-500">
          {passwordRequired ? "Geschützter Link" : "Öffentlicher Link"}
        </p>
        <div className="flex items-center gap-1.5 rounded-xl bg-stone-50 px-2.5 py-2 ring-1 ring-stone-100 dark:bg-stone-800 dark:ring-stone-700">
          {passwordRequired ? (
            <Lock className="size-3.5 shrink-0 text-stone-400" />
          ) : (
            <Link2 className="size-3.5 shrink-0 text-sky-500" />
          )}
          <span className="min-w-0 flex-1 truncate font-mono text-[11px] text-sky-600 dark:text-sky-400">
            {shareUrl}
          </span>
          <button
            type="button"
            onClick={() => void copy(shareUrl, "Link")}
            className="rounded p-1 text-stone-400 hover:text-stone-700 dark:hover:text-stone-200"
            aria-label="Link kopieren"
          >
            <Copy className="size-3.5" />
          </button>
        </div>
        <p className="mt-1.5 text-[11px] text-stone-400">{accessHint}</p>
      </div>

      {passwordRequired && (
        <div className="mb-4 rounded-xl bg-stone-50 px-3 py-2.5 ring-1 ring-stone-100 dark:bg-stone-800 dark:ring-stone-700">
          <div className="flex items-center gap-2 text-[12px] text-stone-600 dark:text-stone-300">
            <Lock className="size-3.5 shrink-0 text-stone-400" />
            <span className="font-medium">Passwort erforderlich</span>
          </div>
          <p className="mt-1.5 text-[11px] leading-relaxed text-stone-400">
            Das Passwort wird nicht im Link übermittelt. Teilen Sie es separat
            mit dem Empfänger. Zum Ändern: Einstellungen im Dashboard.
          </p>
        </div>
      )}

      <div className="flex flex-col gap-2">
        <Button
          variant="outline"
          size="sm"
          className="h-9 w-full rounded-xl"
          onClick={() => void copy(shareUrl, "Link")}
        >
          <Copy data-icon="inline-start" />
          Link kopieren
        </Button>
        <Button
          variant="outline"
          size="sm"
          className="h-9 w-full rounded-xl"
          render={
            <a href={shareUrl} target="_blank" rel="noopener noreferrer" />
          }
        >
          <ExternalLink data-icon="inline-start" />
          Dokument öffnen
        </Button>
        {manageHref && (
          <Button
            variant="ghost"
            size="sm"
            className="h-9 w-full rounded-xl"
            render={<a href={manageHref} />}
          >
            <Settings2 data-icon="inline-start" />
            Teilen verwalten
          </Button>
        )}
      </div>
    </div>
  );
}
