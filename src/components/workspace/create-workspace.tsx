"use client";

import { useCallback, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  FileText,
  FolderPlus,
  Plus,
  Settings2,
  Share2,
  Trash2,
  Upload,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { LivePreview } from "@/components/editor/live-preview";
import { PublishDialog } from "@/components/editor/publish-dialog";
import { EXAMPLE_MARKDOWN } from "@/lib/markdown/example";
import { appConfig } from "@/lib/config";
import { publishDocumentAction } from "@/app/actions/documents";
import { StatusPill, statusFromDocument } from "@/components/design/status-pill";
import { SharePanel } from "./share-panel";
import type { EditorDocumentState } from "@/components/editor/document-editor";
import { cn } from "@/lib/utils";

const defaultState: EditorDocumentState = {
  title: "",
  description: "",
  markdownContent: "",
  visibility: "unlisted",
  status: "published",
  password: "",
  theme: "system",
  contentWidth: "normal",
  fontStyle: "sans",
  showTableOfContents: true,
  showCodeLineNumbers: false,
  expiryPreset: "never",
  customExpiryDate: "",
};

type PublishResult = {
  shareUrl: string;
  manageUrl: string;
  managementToken: string;
  publicId: string;
};

function readPendingUpload(projectId?: string | null): EditorDocumentState {
  const base = { ...defaultState, projectId };
  if (typeof window === "undefined") return base;
  try {
    const raw = sessionStorage.getItem("readlane:pending-upload");
    if (!raw) return base;
    sessionStorage.removeItem("readlane:pending-upload");
    const data = JSON.parse(raw) as {
      name?: string;
      content?: string;
      projectId?: string | null;
    };
    if (!data.content?.trim()) return base;
    const baseTitle = (data.name || "Dokument").replace(
      /\.(md|markdown|txt)$/i,
      ""
    );
    queueMicrotask(() => toast.success("Datei geladen"));
    return {
      ...base,
      markdownContent: data.content,
      title: baseTitle,
      projectId: data.projectId ?? projectId ?? null,
    };
  } catch {
    return base;
  }
}

/**
 * Authenticated create/publish workspace.
 * Free: one slot — replace keeps the share link.
 */
export function CreateWorkspace({
  projectId,
  replaceActive = false,
  plan = "free",
}: {
  projectId?: string | null;
  replaceActive?: boolean;
  plan?: "free" | "pro" | "business";
}) {
  const router = useRouter();
  const [state, setState] = useState<EditorDocumentState>(() =>
    readPendingUpload(projectId)
  );
  const [confirmReplace, setConfirmReplace] = useState(false);
  const [publishOpen, setPublishOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [result, setResult] = useState<PublishResult | null>(null);
  const [showShare, setShowShare] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const update = useCallback((patch: Partial<EditorDocumentState>) => {
    setState((s) => ({ ...s, ...patch }));
  }, []);

  const startNewDocument = useCallback(() => {
    setResult(null);
    setShowShare(false);
    setPublishOpen(false);
    setState({ ...defaultState, projectId: projectId ?? null });
  }, [projectId]);

  const validateFile = (file: File): string | null => {
    const name = file.name.toLowerCase();
    const allowed = [
      ...appConfig.allowedExtensions,
      ".mdx",
      ".csv",
      ".js",
      ".ts",
      ".jsx",
      ".tsx",
      ".css",
      ".json",
      ".yaml",
      ".yml",
      ".py",
      ".go",
      ".rs",
      ".sh",
      ".sql",
      ".html",
      ".htm",
    ];
    const ok = allowed.some((ext) => name.endsWith(ext));
    if (!ok) {
      return "Dieses Format wird noch nicht unterstützt.";
    }
    if (file.size > appConfig.maxFileSizeBytes) {
      return `Datei ist zu groß (max. ${Math.round(appConfig.maxFileSizeBytes / 1024 / 1024)} MB).`;
    }
    return null;
  };

  const loadFile = async (file: File) => {
    const err = validateFile(file);
    if (err) {
      toast.error(err);
      return;
    }
    const text = await file.text();
    if (!text.trim()) {
      toast.error("Die Datei ist leer.");
      return;
    }
    const baseTitle = file.name.replace(/\.(md|markdown|txt)$/i, "");
    if (result) {
      setResult(null);
      setShowShare(false);
    }
    setState((s) => ({
      ...s,
      markdownContent: text,
      title: baseTitle,
      description: "",
    }));
    toast.success("Datei geladen");
  };

  const onDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files?.[0];
    if (file) await loadFile(file);
  };

  const handlePublish = async (opts?: { replace?: boolean }) => {
    if (!state.markdownContent.trim()) {
      toast.error("Dokument darf nicht leer sein.");
      return;
    }
    if (result) {
      router.push(`/dashboard/documents/${result.publicId}`);
      return;
    }

    const doReplace = Boolean(opts?.replace ?? replaceActive);
    if (replaceActive && !opts?.replace && !confirmReplace) {
      setConfirmReplace(true);
      setPublishOpen(false);
      return;
    }

    // Free: no password
    const visibility =
      plan === "free" && state.visibility === "password"
        ? "unlisted"
        : state.visibility;

    setSaving(true);
    try {
      const res = await publishDocumentAction({
        title: state.title || "Untitled",
        description: state.description || null,
        markdownContent: state.markdownContent,
        visibility,
        status: state.status,
        password: plan === "free" ? null : state.password || null,
        theme: state.theme,
        contentWidth: state.contentWidth,
        fontStyle: state.fontStyle,
        showTableOfContents: state.showTableOfContents,
        showCodeLineNumbers: state.showCodeLineNumbers,
        expiryPreset: plan === "free" ? "never" : state.expiryPreset,
        customExpiryDate: state.customExpiryDate || null,
        projectId: plan === "free" ? null : state.projectId,
        replaceActive: doReplace,
      });
      if (!res.ok || !res.data) {
        if (res.ok === false && res.error.includes("Pro")) {
          toast.error(res.error, {
            action: {
              label: "Upgrade",
              onClick: () => router.push("/dashboard/upgrade"),
            },
          });
          return;
        }
        toast.error(res.ok === false ? res.error : "Fehler");
        return;
      }
      const next: PublishResult = {
        shareUrl: res.data.shareUrl,
        manageUrl: res.data.manageUrl,
        managementToken: res.data.managementToken,
        publicId: res.data.publicId,
      };
      setResult(next);
      setShowShare(true);
      setConfirmReplace(false);
      toast.success(
        doReplace
          ? "Dokument ersetzt — Share-Link unverändert"
          : "Dokument veröffentlicht"
      );
    } finally {
      setSaving(false);
    }
  };

  const hasContent = Boolean(state.markdownContent.trim());
  const statusKind = result
    ? statusFromDocument({
        status: state.status,
        visibility: state.visibility,
        isPasswordProtected: state.visibility === "password",
      })
    : "draft";

  return (
    <div className="grid h-full min-h-0 lg:grid-cols-[minmax(0,1.15fr)_minmax(360px,0.85fr)] xl:grid-cols-[minmax(0,1.2fr)_minmax(420px,0.8fr)]">
      <section className="flex min-h-0 min-w-0 flex-col overflow-y-auto p-6 sm:p-8 lg:p-10">
        <div className="mb-6">
          <h1 className="text-[32px] font-semibold tracking-[-0.035em] text-stone-900 dark:text-stone-50 sm:text-[36px]">
            {replaceActive ? "Dokument ersetzen" : "Dokumente schön teilen."}
          </h1>
          <p className="mt-2 text-[15px] text-stone-500">
            {replaceActive
              ? "Dein Share-Link bleibt erhalten und zeigt danach das neue Dokument."
              : plan === "free"
                ? "Veröffentliche dein Dokument — unbegrenzte Updates, ein dauerhafter Link."
                : "Hochladen. Formatieren. Veröffentlichen. Per Link teilen."}
          </p>
          <div className="mt-4 flex flex-wrap gap-2">
            <input
              ref={fileInputRef}
              type="file"
              accept=".md,.markdown,.txt,text/markdown,text/plain"
              className="sr-only"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) void loadFile(f);
                e.target.value = "";
              }}
            />
            <Button
              size="sm"
              className="h-9 rounded-full"
              onClick={() => fileInputRef.current?.click()}
            >
              <Plus data-icon="inline-start" />
              Dokument hochladen
            </Button>
            {!result && !hasContent && (
              <Button
                size="sm"
                variant="outline"
                className="h-9 rounded-full"
                onClick={() =>
                  update({
                    markdownContent: EXAMPLE_MARKDOWN,
                    title: state.title || "Beispieldokument",
                  })
                }
              >
                <FolderPlus data-icon="inline-start" />
                Beispiel laden
              </Button>
            )}
            {hasContent && !result && (
              <>
                <Button
                  size="sm"
                  variant="outline"
                  className="h-9 rounded-full"
                  onClick={() => setPublishOpen(true)}
                >
                  <Settings2 data-icon="inline-start" />
                  Einstellungen
                </Button>
                <Button
                  size="sm"
                  className="h-9 rounded-full"
                  disabled={saving}
                  onClick={() => setPublishOpen(true)}
                >
                  Veröffentlichen
                </Button>
              </>
            )}
            {result && (
              <>
                <Button
                  size="sm"
                  variant="outline"
                  className="h-9 rounded-full"
                  onClick={() => setShowShare(true)}
                >
                  <Share2 data-icon="inline-start" />
                  Teilen
                </Button>
                <Button
                  size="sm"
                  className="h-9 rounded-full"
                  render={
                    <Link href={`/dashboard/documents/${result.publicId}`} />
                  }
                >
                  Im Dashboard
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  className="h-9 rounded-full"
                  onClick={() => startNewDocument()}
                >
                  Weiteres Dokument
                </Button>
              </>
            )}
          </div>
        </div>

        <div className="mb-4 min-h-0 flex-1">
            <div className="mb-2 flex items-center justify-between">
              <div className="flex min-w-0 items-center gap-2">
                <FileText className="size-3.5 shrink-0 text-stone-400" />
                <span className="truncate text-[13px] font-medium text-stone-700 dark:text-stone-200">
                  {state.title || "Unbenannt.md"}
                </span>
                <StatusPill kind={statusKind} />
              </div>
              {!result && hasContent && (
                <Button
                  size="icon-xs"
                  variant="ghost"
                  onClick={() =>
                    update({
                      markdownContent: "",
                      title: "",
                      description: "",
                    })
                  }
                  aria-label="Leeren"
                >
                  <Trash2 />
                </Button>
              )}
            </div>
            <Textarea
              autoFocus
              value={state.markdownContent}
              onChange={(e) => update({ markdownContent: e.target.value })}
              placeholder="Markdown hier einfügen oder Datei ablegen…"
              className="min-h-[min(50vh,420px)] flex-1 resize-y rounded-xl border-stone-200 bg-stone-50/50 font-mono text-[13px] dark:border-stone-800 dark:bg-stone-900/40"
              onDragOver={(e) => {
                e.preventDefault();
                setDragOver(true);
              }}
              onDragLeave={() => setDragOver(false)}
              onDrop={onDrop}
              readOnly={Boolean(result)}
            />
            {result && (
              <div className="mt-3 rounded-xl bg-stone-50 px-3.5 py-3 text-[12px] leading-relaxed text-stone-600 ring-1 ring-stone-100 dark:bg-stone-900 dark:text-stone-300 dark:ring-stone-800">
                <p className="font-medium text-stone-800 dark:text-stone-100">
                  Veröffentlicht und in Ihrem Konto gespeichert
                </p>
                <p className="mt-1 text-stone-500">
                  Teilen Sie den Link, bearbeiten Sie im Dashboard oder legen
                  Sie gleich das nächste Dokument an.
                </p>
                <div className="mt-2 flex flex-wrap gap-3">
                  <Link
                    href={`/dashboard/documents/${result.publicId}`}
                    className="font-medium text-stone-800 underline-offset-2 hover:underline dark:text-stone-100"
                  >
                    Im Dashboard öffnen
                  </Link>
                  <button
                    type="button"
                    className="font-medium text-stone-800 underline-offset-2 hover:underline dark:text-stone-100"
                    onClick={() => startNewDocument()}
                  >
                    Weiteres Dokument
                  </button>
                </div>
              </div>
            )}
        </div>

        <div className="mt-auto grid gap-3 sm:grid-cols-2">
          <div className="rounded-2xl bg-stone-50 p-3.5 ring-1 ring-stone-100 dark:bg-stone-900 dark:ring-stone-800">
            <p className="text-[12px] font-medium text-stone-700 dark:text-stone-200">
              Aus VS Code oder Terminal
            </p>
            <p className="mt-0.5 text-[11px] text-stone-400">
              CLI mit Ihrem Konto verbinden und pushen.
            </p>
            <pre className="mt-2 overflow-x-auto rounded-xl bg-stone-900 p-3 font-mono text-[11px] leading-relaxed text-stone-200">
              <span className="text-stone-500">$ </span>
              {appConfig.cliName} push README.md --open{"\n"}
              <span className="text-emerald-400">✓</span> README.md
              veröffentlicht{"\n"}
              <span className="text-sky-300">
                {appConfig.url.replace(/^https?:\/\//, "")}/d/…
              </span>
            </pre>
            <Link
              href="/dashboard/settings"
              className="mt-2 inline-block text-[11px] font-medium text-stone-500 underline-offset-2 hover:underline"
            >
              CLI-Zugänge verwalten
            </Link>
          </div>

          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            onDragOver={(e) => {
              e.preventDefault();
              setDragOver(true);
            }}
            onDragLeave={() => setDragOver(false)}
            onDrop={onDrop}
            className={cn(
              "flex flex-col items-center justify-center rounded-2xl border border-dashed p-5 text-center transition",
              dragOver
                ? "border-stone-400 bg-stone-50 dark:border-stone-500"
                : "border-stone-200 bg-white hover:border-stone-300 hover:bg-stone-50/60 dark:border-stone-700 dark:bg-stone-950"
            )}
          >
            <Upload className="mb-2 size-5 text-stone-300" strokeWidth={1.5} />
            <p className="text-[13px] font-medium text-stone-700 dark:text-stone-200">
              Datei hier ablegen
            </p>
            <p className="mt-0.5 text-[11px] text-stone-400">
              oder klicken zum Auswählen
            </p>
            <p className="mt-2 text-[10px] text-stone-300">
              .md, .markdown, .txt bis{" "}
              {Math.round(appConfig.maxFileSizeBytes / 1024 / 1024)} MB
            </p>
          </button>
        </div>
      </section>

      <aside className="relative hidden min-h-0 flex-col border-l border-stone-200/70 bg-[#fcfcfb] dark:border-stone-800 dark:bg-stone-950/40 lg:flex">
        <div className="flex items-center justify-between border-b border-stone-100 px-5 py-3.5 dark:border-stone-800">
          <div className="flex min-w-0 items-center gap-2">
            <FileText className="size-3.5 shrink-0 text-stone-400" />
            <span className="truncate text-[13px] font-medium text-stone-700 dark:text-stone-200">
              {state.title || "Vorschau.md"}
            </span>
            <StatusPill kind={statusKind} />
          </div>
          <div className="flex items-center gap-1.5 text-stone-400">
            {result && (
              <button
                type="button"
                onClick={() => setShowShare((v) => !v)}
                className={cn(
                  "rounded-md p-1 hover:bg-stone-100 hover:text-stone-700",
                  showShare && "bg-stone-100 text-stone-700"
                )}
                aria-label="Teilen"
              >
                <Share2 className="size-3.5" strokeWidth={1.75} />
              </button>
            )}
            {!result && (
              <button
                type="button"
                onClick={() => setPublishOpen(true)}
                className="rounded-md p-1 hover:bg-stone-100 hover:text-stone-700"
                aria-label="Einstellungen"
                disabled={!hasContent}
              >
                <Settings2 className="size-3.5" strokeWidth={1.75} />
              </button>
            )}
          </div>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto p-5 lg:p-6">
          {hasContent ? (
            <div className="grid grid-cols-[88px_1fr] gap-5 xl:grid-cols-[100px_1fr]">
              <nav className="text-[12px]" aria-label="Inhalt">
                <p className="mb-2 font-medium uppercase tracking-[0.12em] text-stone-400">
                  Inhalt
                </p>
                <ul className="flex flex-col gap-1.5 border-l border-stone-200 pl-2 dark:border-stone-700">
                  {(state.markdownContent.match(/^#{1,3}\s+.+$/gm) || [])
                    .slice(0, 8)
                    .map((line, i) => {
                      const text = line.replace(/^#+\s+/, "");
                      return (
                        <li
                          key={`${text}-${i}`}
                          className={
                            i === 0
                              ? "font-medium text-sky-600"
                              : "text-stone-400"
                          }
                        >
                          {text.slice(0, 28)}
                        </li>
                      );
                    })}
                  {(state.markdownContent.match(/^#{1,3}\s+.+$/gm) || [])
                    .length === 0 && (
                    <li className="text-stone-300">—</li>
                  )}
                </ul>
              </nav>
              <div className="min-w-0">
                <LivePreview
                  markdown={state.markdownContent}
                  contentWidth="narrow"
                  fontStyle={state.fontStyle}
                  className="!max-w-none !p-0 text-[13px]"
                />
              </div>
            </div>
          ) : (
            <div className="flex h-full flex-col items-center justify-center px-6 text-center">
              <p className="text-[14px] font-medium text-stone-600 dark:text-stone-300">
                Live-Vorschau
              </p>
              <p className="mt-1 text-[12px] text-stone-400">
                Der formatierte Inhalt erscheint hier, sobald Sie Markdown laden.
              </p>
            </div>
          )}
        </div>

        {showShare && result && (
          <div className="absolute right-4 top-16 z-20 w-[min(320px,calc(100%-2rem))]">
            <SharePanel
              shareUrl={result.shareUrl}
              title={state.title || "Dokument"}
              isPasswordProtected={state.visibility === "password"}
              visibility={state.visibility}
              manageHref={`/dashboard/documents/${result.publicId}`}
              onClose={() => setShowShare(false)}
            />
          </div>
        )}
      </aside>

      {confirmReplace && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl dark:bg-stone-900">
            <h2 className="text-[18px] font-semibold text-stone-900 dark:text-stone-50">
              Bestehendes Dokument ersetzen?
            </h2>
            <p className="mt-2 text-[13px] leading-relaxed text-stone-500">
              Dein aktueller Share-Link bleibt erhalten und zeigt anschließend
              das neue Dokument. Die bisherige Version ist im Free-Tarif danach
              nicht mehr verfügbar.
            </p>
            <div className="mt-5 flex flex-wrap justify-end gap-2">
              <Button
                variant="outline"
                className="rounded-full"
                onClick={() => setConfirmReplace(false)}
              >
                Abbrechen
              </Button>
              <Button
                className="rounded-full"
                disabled={saving}
                onClick={() => void handlePublish({ replace: true })}
              >
                {saving ? "Bitte warten…" : "Dokument ersetzen"}
              </Button>
            </div>
            <p className="mt-4 text-center text-[12px] text-stone-400">
              Zweites Dokument behalten?{" "}
              <Link
                href="/dashboard/upgrade"
                className="font-medium text-stone-700 underline-offset-2 hover:underline"
              >
                Upgrade zu Pro
              </Link>
            </p>
          </div>
        </div>
      )}

      <PublishDialog
        open={publishOpen}
        onOpenChange={setPublishOpen}
        state={state}
        onChange={update}
        mode="publish"
        onSubmit={async () => {
          await handlePublish(replaceActive ? { replace: true } : undefined);
        }}
        saving={saving}
        result={result}
        shareUrl={result?.shareUrl}
      />
    </div>
  );
}
