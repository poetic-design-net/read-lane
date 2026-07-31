"use client";

import { useState } from "react";
import Link from "next/link";
import { format } from "date-fns";
import { de } from "date-fns/locale";
import {
  Copy,
  ExternalLink,
  FileText,
  Pencil,
  RefreshCw,
  Sparkles,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { StatusPill, statusFromDocument } from "@/components/design/status-pill";
import { LivePreview } from "@/components/editor/live-preview";
import { shareUrl } from "@/lib/utils/urls";
import { appConfig } from "@/lib/config";
import type { SafeDocumentListItem } from "@/types/document";

export function FreeSlotDashboard({
  document: doc,
  previewMarkdown,
}: {
  document: SafeDocumentListItem | null;
  previewMarkdown?: string;
}) {
  const [copied, setCopied] = useState(false);
  const url = doc ? shareUrl(doc.publicId) : null;

  async function copyLink() {
    if (!url) return;
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      toast.success("Link kopiert");
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error("Kopieren fehlgeschlagen");
    }
  }

  return (
    <div className="mx-auto h-full max-w-3xl overflow-y-auto px-6 py-10 sm:px-10">
      <div className="mb-8">
        <p className="text-[11px] font-medium uppercase tracking-[0.14em] text-stone-400">
          Free
        </p>
        <h1 className="mt-1 text-[32px] font-semibold tracking-[-0.035em] text-stone-900 dark:text-stone-50">
          Dein kostenloser Link
        </h1>
        <p className="mt-2 text-[15px] text-stone-500">
          Veröffentliche ein Dokument und aktualisiere es beliebig oft. Der
          Share-Link bleibt dabei gleich.
        </p>
      </div>

      {!doc ? (
        <div className="rounded-2xl border border-dashed border-stone-200 bg-white p-10 text-center dark:border-stone-700 dark:bg-stone-950">
          <FileText className="mx-auto mb-3 size-8 text-stone-300" />
          <p className="text-[15px] font-medium text-stone-800 dark:text-stone-100">
            Noch nichts veröffentlicht
          </p>
          <p className="mx-auto mt-1 max-w-sm text-[13px] text-stone-400">
            Lade Markdown, Text oder Code hoch und teile es mit einem dauerhaften
            Link.
          </p>
          <Button
            className="mt-5 rounded-full"
            render={<Link href="/create" />}
          >
            Dokument veröffentlichen
          </Button>
        </div>
      ) : (
        <div className="space-y-5">
          <div className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-black/[0.04] dark:bg-stone-900 dark:ring-white/10">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <h2 className="truncate text-[18px] font-semibold text-stone-900 dark:text-stone-50">
                    {doc.sourceFilename || doc.title}
                  </h2>
                  <StatusPill kind={statusFromDocument(doc)} />
                  {doc.fileExtension && (
                    <span className="rounded-full bg-stone-100 px-2 py-0.5 text-[10px] font-medium uppercase text-stone-500 dark:bg-stone-800">
                      .{doc.fileExtension}
                    </span>
                  )}
                </div>
                <p className="mt-1 text-[12px] text-stone-400">
                  Aktualisiert{" "}
                  {format(new Date(doc.updatedAt), "dd. MMM yyyy, HH:mm", {
                    locale: de,
                  })}
                </p>
              </div>
            </div>

            {url && (
              <div className="mt-4">
                <p className="mb-1.5 text-[11px] font-medium text-stone-500">
                  Share-Link
                </p>
                <div className="flex items-center gap-2 rounded-xl bg-stone-50 px-3 py-2.5 ring-1 ring-stone-100 dark:bg-stone-800 dark:ring-stone-700">
                  <code className="min-w-0 flex-1 truncate text-[12px] text-sky-600 dark:text-sky-400">
                    {url}
                  </code>
                  <button
                    type="button"
                    onClick={() => void copyLink()}
                    className="rounded-md p-1.5 text-stone-400 hover:bg-white hover:text-stone-700 dark:hover:bg-stone-700"
                    aria-label="Link kopieren"
                  >
                    <Copy className="size-3.5" />
                  </button>
                </div>
              </div>
            )}

            <div className="mt-4 flex flex-wrap gap-2">
              <Button
                size="sm"
                className="rounded-full"
                onClick={() => void copyLink()}
              >
                <Copy data-icon="inline-start" />
                {copied ? "Kopiert" : "Link kopieren"}
              </Button>
              {url && (
                <Button
                  size="sm"
                  variant="outline"
                  className="rounded-full"
                  render={
                    <a href={url} target="_blank" rel="noopener noreferrer" />
                  }
                >
                  <ExternalLink data-icon="inline-start" />
                  Ansehen
                </Button>
              )}
              <Button
                size="sm"
                variant="outline"
                className="rounded-full"
                render={<Link href={`/dashboard/documents/${doc.publicId}`} />}
              >
                <Pencil data-icon="inline-start" />
                Bearbeiten
              </Button>
              <Button
                size="sm"
                variant="outline"
                className="rounded-full"
                render={<Link href="/create?replace=1" />}
              >
                <RefreshCw data-icon="inline-start" />
                Dokument ersetzen
              </Button>
            </div>
          </div>

          {previewMarkdown && (
            <div className="rounded-2xl bg-[#fcfcfb] p-5 ring-1 ring-stone-100 dark:bg-stone-950 dark:ring-stone-800">
              <p className="mb-3 text-[11px] font-medium uppercase tracking-[0.12em] text-stone-400">
                Vorschau
              </p>
              <LivePreview
                markdown={previewMarkdown}
                contentWidth="narrow"
                className="!max-w-none !p-0 text-[13px]"
              />
            </div>
          )}

          <div className="rounded-2xl bg-gradient-to-br from-stone-900 to-stone-800 p-5 text-stone-200">
            <div className="flex items-start gap-3">
              <Sparkles className="mt-0.5 size-4 shrink-0 text-amber-300" />
              <div>
                <p className="text-[14px] font-semibold text-white">
                  Zweites Dokument?
                </p>
                <p className="mt-1 text-[13px] leading-relaxed text-stone-400">
                  Mit Pro veröffentlichst du beliebig viele Dokumente, nutzt
                  Projekte, Passwortschutz und CLI-Sync — ohne den Free-Link zu
                  ersetzen.
                </p>
                <Button
                  size="sm"
                  className="mt-3 rounded-full bg-white text-stone-900 hover:bg-stone-100"
                  render={<Link href="/dashboard/upgrade" />}
                >
                  Upgrade zu Pro
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      <p className="mt-10 text-center text-[11px] text-stone-400">
        {appConfig.name} Free · 1 dauerhafter Link · unbegrenzte Updates
      </p>
    </div>
  );
}
