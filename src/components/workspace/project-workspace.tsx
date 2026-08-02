"use client";

import { useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Copy,
  ExternalLink,
  FileText,
  FolderInput,
  MoreHorizontal,
  Pencil,
  Plus,
  Settings2,
  Share2,
  Terminal,
  Trash2,
  Upload,
} from "lucide-react";
import { format, formatDistanceToNow } from "date-fns";
import { de } from "date-fns/locale";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { StatusPill, statusFromDocument } from "@/components/design/status-pill";
import { LivePreview } from "@/components/editor/live-preview";
import { useFileIntake } from "@/components/editor/use-file-intake";
import {
  ACCEPT_ATTRIBUTE,
  detectRenderer,
  isTextBasedRenderer,
} from "@/lib/documents/formats";
import type { PlanId } from "@/lib/plans/config";
import { SharePanel } from "./share-panel";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { ProjectSummary, SafeDocumentListItem } from "@/types/document";
import { shareUrl } from "@/lib/utils/urls";
import {
  deleteDashboardDocumentAction,
  moveDocumentToProjectAction,
} from "@/app/actions/documents";
import { cn } from "@/lib/utils";

function extractHeadings(markdown: string): string[] {
  return (markdown.match(/^#{1,3}\s+.+$/gm) || []).map((line) =>
    line.replace(/^#+\s+/, "").trim()
  );
}

function relativeUpdated(date: Date | string): string {
  const d = typeof date === "string" ? new Date(date) : date;
  const now = Date.now();
  const diff = now - d.getTime();
  if (diff < 60_000) return "Gerade eben";
  if (diff < 24 * 60 * 60_000) {
    return formatDistanceToNow(d, { addSuffix: false, locale: de }) + " her";
  }
  if (diff < 48 * 60 * 60_000) return "Gestern, " + format(d, "HH:mm");
  return format(d, "d. MMM yyyy", { locale: de });
}

export function ProjectWorkspace({
  project,
  projects = [],
  documents,
  previews,
  mode = "project",
  plan = "pro",
}: {
  project?: ProjectSummary | null;
  /** Move targets — every project the user may write to. */
  projects?: ProjectSummary[];
  documents: SafeDocumentListItem[];
  previews: Record<string, string>;
  /** project page vs dashboard overview */
  mode?: "project" | "dashboard";
  /** Decides the upload size limit for dropped files. */
  plan?: PlanId;
}) {
  const [selectedId, setSelectedId] = useState<string | null>(
    documents[0]?.publicId ?? null
  );
  const [shareOpen, setShareOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [dragOver, setDragOver] = useState(false);
  const [moving, setMoving] = useState<string | null>(null);
  const [deleting, setDeleting] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();
  const { pickFile, uploading } = useFileIntake(plan);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return documents;
    return documents.filter(
      (d) =>
        d.title.toLowerCase().includes(q) ||
        (d.sourceFilename ?? "").toLowerCase().includes(q) ||
        (d.sourcePath ?? "").toLowerCase().includes(q) ||
        (d.slug ?? "").toLowerCase().includes(q)
    );
  }, [documents, query]);

  const selected = useMemo(
    () => filtered.find((d) => d.publicId === selectedId) ?? filtered[0] ?? null,
    [filtered, selectedId]
  );

  const previewMd =
    selected && previews[selected.publicId]
      ? previews[selected.publicId]
      : selected
        ? `# ${selected.title}\n\n${selected.description ?? "_Keine Vorschau geladen._"}`
        : "";

  const headings = useMemo(() => extractHeadings(previewMd), [previewMd]);

  const createHref = project
    ? `/create?project=${encodeURIComponent(project.publicId)}`
    : "/create";

  async function remove(doc: SafeDocumentListItem) {
    const label = doc.sourceFilename || doc.title;
    if (!confirm(`„${label}“ löschen? Der Share-Link funktioniert danach nicht mehr.`)) {
      return;
    }
    setDeleting(doc.publicId);
    const res = await deleteDashboardDocumentAction(doc.publicId);
    setDeleting(null);
    if (!res.ok) {
      toast.error(res.error);
      return;
    }
    if (selectedId === doc.publicId) setSelectedId(null);
    toast.success("Dokument gelöscht");
    router.refresh();
  }

  async function moveTo(publicId: string, target: string | null) {
    setMoving(publicId);
    const res = await moveDocumentToProjectAction(publicId, target);
    setMoving(null);
    if (!res.ok) {
      toast.error(res.error);
      return;
    }
    toast.success(target ? "Dokument verschoben" : "Aus Projekt entfernt");
    router.refresh();
  }

  async function copyLink(url: string) {
    try {
      await navigator.clipboard.writeText(url);
      toast.success("Link kopiert");
    } catch {
      toast.error("Kopieren fehlgeschlagen");
    }
  }

  /**
   * A file dropped here is handed to the editor, which is where publishing
   * happens. Text is carried as text; everything else is uploaded first and
   * travels as a file id, because a File cannot survive the navigation.
   */
  async function onFilePicked(file: File | null) {
    if (!file) return;

    const handOver = (payload: Record<string, unknown>) => {
      try {
        sessionStorage.setItem(
          "readlane:pending-upload",
          JSON.stringify({ ...payload, projectId: project?.publicId ?? null })
        );
      } catch {
        // ignore quota
      }
      router.push(createHref);
    };

    if (isTextBasedRenderer(detectRenderer(file.name, file.type))) {
      handOver({ name: file.name, content: await file.text() });
      return;
    }

    const intake = await pickFile(file);
    if (!intake) return;
    handOver({
      name: intake.sourceFilename,
      content: intake.markdownContent,
      rendererType: intake.rendererType,
      fileId: intake.fileId,
      previewUrl: intake.previewUrl,
      fileSize: intake.fileSize,
    });
  }

  return (
    <div className="grid h-full min-h-0 lg:grid-cols-[minmax(0,1.15fr)_minmax(360px,0.85fr)] xl:grid-cols-[minmax(0,1.2fr)_minmax(420px,0.8fr)]">
      {/* Center: list + actions. The whole column takes dropped files, so no
          permanent drop zone has to sit around waiting for one. */}
      <section
        className="relative flex min-h-0 min-w-0 flex-col overflow-y-auto p-6 sm:p-8 lg:p-10"
        onDragOver={(e) => {
          e.preventDefault();
          setDragOver(true);
        }}
        onDragLeave={(e) => {
          if (!e.currentTarget.contains(e.relatedTarget as Node)) {
            setDragOver(false);
          }
        }}
        onDrop={(e) => {
          e.preventDefault();
          setDragOver(false);
          void onFilePicked(e.dataTransfer.files?.[0] ?? null);
        }}
      >
        {dragOver && (
          <div className="pointer-events-none absolute inset-4 z-20 flex flex-col items-center justify-center rounded-2xl border-2 border-dashed border-stone-400 bg-stone-50/95 dark:border-stone-500 dark:bg-stone-900/95">
            <Upload className="mb-2 size-6 text-stone-400" strokeWidth={1.5} />
            <p className="text-[14px] font-medium text-stone-700 dark:text-stone-200">
              Datei hier ablegen
            </p>
            <p className="mt-1 text-[12px] text-stone-400">
              Markdown, Text, Code, CSV, PDF, Bilder, Word
            </p>
          </div>
        )}
        <div className="mb-6">
          <h1 className="text-[32px] font-semibold tracking-[-0.035em] text-stone-900 dark:text-stone-50 sm:text-[36px]">
            {mode === "dashboard" && !project
              ? "Markdown schön teilen."
              : project?.name ?? "Projekt"}
          </h1>
          <p className="mt-2 text-[15px] text-stone-500">
            {mode === "dashboard" && !project
              ? "Hochladen. Formatieren. Veröffentlichen. Per Link teilen."
              : project?.description ||
                "Dokumente verwalten, Vorschau prüfen und per Link teilen."}
          </p>
          <div className="mt-4 flex flex-wrap items-center gap-2">
            <input
              ref={fileInputRef}
              type="file"
              accept={ACCEPT_ATTRIBUTE}
              className="sr-only"
              onChange={(e) => {
                void onFilePicked(e.target.files?.[0] ?? null);
                e.target.value = "";
              }}
            />
            <Button
              size="sm"
              className="h-9 rounded-full"
              disabled={uploading}
              onClick={() => fileInputRef.current?.click()}
            >
              <Plus data-icon="inline-start" />
              {uploading ? "Wird geladen…" : "Dokument hochladen"}
            </Button>
            <Button
              size="sm"
              variant="outline"
              className="h-9 rounded-full"
              render={<Link href={createHref} />}
            >
              <FileText data-icon="inline-start" />
              Neu schreiben
            </Button>
            {project && (
              <>
                <Button
                  size="sm"
                  variant="outline"
                  className="h-9 rounded-full"
                  render={<Link href="/dashboard/settings" />}
                >
                  <Terminal data-icon="inline-start" />
                  CLI verbinden
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  className="h-9 rounded-full"
                  render={
                    <Link
                      href={`/dashboard/projects/${project.publicId}?settings=1`}
                    />
                  }
                >
                  <Settings2 data-icon="inline-start" />
                  Projekt umbenennen
                </Button>
              </>
            )}
          </div>
        </div>

        {documents.length > 4 && (
          <div className="mb-3">
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Dokumente suchen…"
              className="h-9 w-full max-w-sm rounded-full border border-stone-200 bg-white px-3.5 text-[13px] outline-none ring-stone-300 focus:ring-2 dark:border-stone-700 dark:bg-stone-900"
              aria-label="Dokumente suchen"
            />
          </div>
        )}

        <div className="mb-2 grid grid-cols-[1fr_88px_110px_28px] gap-2 px-1 text-[10px] font-medium uppercase tracking-[0.12em] text-stone-400">
          <span>Dokumente</span>
          <span>Status</span>
          <span>Aktualisiert</span>
          <span />
        </div>

        {filtered.length === 0 ? (
          <div
            className={cn(
              "mb-4 flex flex-1 flex-col items-center justify-center rounded-2xl border border-dashed px-6 py-14 text-center transition",
              dragOver
                ? "border-stone-400 bg-stone-50 dark:border-stone-500"
                : "border-stone-200 dark:border-stone-700"
            )}
            onDragOver={(e) => {
              e.preventDefault();
              setDragOver(true);
            }}
            onDragLeave={() => setDragOver(false)}
            onDrop={(e) => {
              e.preventDefault();
              setDragOver(false);
              void onFilePicked(e.dataTransfer.files?.[0] ?? null);
            }}
          >
            <Upload className="mb-3 size-6 text-stone-300" strokeWidth={1.5} />
            <p className="text-sm font-medium text-stone-700 dark:text-stone-200">
              {query ? "Keine Treffer" : "Noch keine Dokumente"}
            </p>
            <p className="mt-1 max-w-sm text-[13px] text-stone-400">
              {query
                ? "Andere Suchbegriffe versuchen."
                : "Markdown-Datei hochladen, neu schreiben oder per CLI pushen."}
            </p>
            {!query && (
              <Button
                size="sm"
                className="mt-4 rounded-full"
                onClick={() => fileInputRef.current?.click()}
              >
                Hochladen
              </Button>
            )}
          </div>
        ) : (
          <ul className="mb-4 divide-y divide-stone-100 dark:divide-stone-800/80">
            {filtered.map((d) => {
              const active = d.publicId === selected?.publicId;
              const pathLabel =
                d.sourcePath || d.sourceFilename || d.title;
              return (
                <li key={d.publicId}>
                  <div
                    className={cn(
                      "grid w-full grid-cols-[1fr_88px_110px_28px] items-center gap-2 py-2.5 transition",
                      active
                        ? "bg-stone-50/90 dark:bg-stone-900/50"
                        : "hover:bg-stone-50/60 dark:hover:bg-stone-900/30"
                    )}
                  >
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedId(d.publicId);
                        setShareOpen(false);
                      }}
                      className="flex min-w-0 items-center gap-2.5 pl-1 text-left"
                    >
                      <span className="flex size-7 shrink-0 items-center justify-center rounded-lg bg-stone-50 ring-1 ring-stone-100 dark:bg-stone-900 dark:ring-stone-800">
                        <FileText
                          className="size-3.5 text-stone-400"
                          strokeWidth={1.75}
                        />
                      </span>
                      <div className="min-w-0">
                        <p className="truncate text-[13px] font-medium text-stone-800 dark:text-stone-100">
                          {d.sourceFilename || `${d.title}.md`}
                        </p>
                        <p className="truncate text-[11px] text-stone-400">
                          {pathLabel.includes("/")
                            ? pathLabel.split("/").slice(0, -1).join("/") || "/"
                            : d.title}
                        </p>
                      </div>
                    </button>
                    <StatusPill kind={statusFromDocument(d)} />
                    <span className="text-[11px] text-stone-400">
                      {relativeUpdated(d.updatedAt)}
                    </span>
                    <div className="flex justify-end pr-1">
                      <DropdownMenu>
                        <DropdownMenuTrigger
                          className="rounded-md p-1 text-stone-300 hover:bg-stone-100 hover:text-stone-600 dark:hover:bg-stone-800"
                          aria-label="Aktionen"
                        >
                          <MoreHorizontal className="size-3.5" />
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="min-w-44">
                          <DropdownMenuItem
                            render={
                              <Link
                                href={`/dashboard/documents/${d.publicId}`}
                              />
                            }
                          >
                            <Pencil className="size-3.5" />
                            Bearbeiten
                          </DropdownMenuItem>
                          {d.status === "published" && (
                            <>
                              <DropdownMenuItem
                                onClick={() => {
                                  setSelectedId(d.publicId);
                                  setShareOpen(true);
                                }}
                              >
                                <Share2 className="size-3.5" />
                                Teilen
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                onClick={() =>
                                  void copyLink(shareUrl(d.publicId))
                                }
                              >
                                <Copy className="size-3.5" />
                                Link kopieren
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                render={
                                  <a
                                    href={shareUrl(d.publicId)}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                  />
                                }
                              >
                                <ExternalLink className="size-3.5" />
                                Öffnen
                              </DropdownMenuItem>
                            </>
                          )}
                          {projects.length > 0 && (
                            <>
                              <DropdownMenuSeparator />
                              <p className="px-2 py-1 text-[11px] uppercase tracking-[0.08em] text-stone-400">
                                Verschieben nach
                              </p>
                              {projects.map((p) => (
                                <DropdownMenuItem
                                  key={p.publicId}
                                  disabled={
                                    moving !== null ||
                                    p.publicId === project?.publicId
                                  }
                                  onClick={() =>
                                    void moveTo(d.publicId, p.publicId)
                                  }
                                >
                                  <FolderInput className="size-3.5" />
                                  {p.name}
                                </DropdownMenuItem>
                              ))}
                              <DropdownMenuItem
                                disabled={moving !== null || !project}
                                onClick={() => void moveTo(d.publicId, null)}
                              >
                                <FolderInput className="size-3.5" />
                                Kein Projekt
                              </DropdownMenuItem>
                            </>
                          )}
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            render={
                              <Link
                                href={`/dashboard/documents/${d.publicId}`}
                              />
                            }
                          >
                            <Settings2 className="size-3.5" />
                            Einstellungen
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            disabled={deleting !== null}
                            onClick={() => void remove(d)}
                            className="text-red-600 dark:text-red-400"
                          >
                            <Trash2 className="size-3.5" />
                            Löschen
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        )}

      </section>

      {/* Right: live preview + share */}
      <aside className="relative hidden min-h-0 flex-col border-l border-stone-200/70 bg-[#fcfcfb] dark:border-stone-800 dark:bg-stone-950/40 lg:flex">
        {selected ? (
          <>
            <div className="flex items-center justify-between border-b border-stone-100 px-5 py-3.5 dark:border-stone-800">
              <div className="flex min-w-0 items-center gap-2">
                <FileText className="size-3.5 shrink-0 text-stone-400" />
                <span className="truncate text-[13px] font-medium text-stone-700 dark:text-stone-200">
                  {selected.sourceFilename || `${selected.title}.md`}
                </span>
                <StatusPill kind={statusFromDocument(selected)} />
              </div>
              <div className="flex items-center gap-0.5 text-stone-400">
                <Link
                  href={`/dashboard/documents/${selected.publicId}`}
                  className="rounded-md p-1.5 hover:bg-stone-100 hover:text-stone-700 dark:hover:bg-stone-800"
                  aria-label="Bearbeiten"
                  title="Bearbeiten"
                >
                  <Pencil className="size-3.5" strokeWidth={1.75} />
                </Link>
                {selected.status === "published" && (
                  <>
                    <a
                      href={shareUrl(selected.publicId)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="rounded-md p-1.5 hover:bg-stone-100 hover:text-stone-700 dark:hover:bg-stone-800"
                      aria-label="Öffentlich öffnen"
                      title="Öffnen"
                    >
                      <ExternalLink className="size-3.5" strokeWidth={1.75} />
                    </a>
                    <button
                      type="button"
                      onClick={() => setShareOpen((v) => !v)}
                      className={cn(
                        "rounded-md p-1.5 hover:bg-stone-100 hover:text-stone-700 dark:hover:bg-stone-800",
                        shareOpen && "bg-stone-100 text-stone-700"
                      )}
                      aria-label="Teilen"
                      title="Teilen"
                    >
                      <Share2 className="size-3.5" strokeWidth={1.75} />
                    </button>
                  </>
                )}
                <Link
                  href={`/dashboard/documents/${selected.publicId}`}
                  className="rounded-md p-1.5 hover:bg-stone-100 hover:text-stone-700 dark:hover:bg-stone-800"
                  aria-label="Einstellungen"
                  title="Einstellungen"
                >
                  <Settings2 className="size-3.5" strokeWidth={1.75} />
                </Link>
              </div>
            </div>

            <div className="min-h-0 flex-1 overflow-y-auto p-5 lg:p-6">
              <div className="grid grid-cols-[88px_1fr] gap-5 xl:grid-cols-[100px_1fr]">
                <nav className="text-[12px]" aria-label="Inhalt">
                  <p className="mb-2 font-medium uppercase tracking-[0.12em] text-stone-400">
                    Inhalt
                  </p>
                  <ul className="flex flex-col gap-1.5 border-l border-stone-200 pl-2 dark:border-stone-700">
                    {headings.length === 0 ? (
                      <li className="text-stone-300">—</li>
                    ) : (
                      headings.slice(0, 10).map((text, i) => (
                        <li
                          key={`${text}-${i}`}
                          className={
                            i === 0
                              ? "font-medium text-sky-600"
                              : "text-stone-400"
                          }
                          title={text}
                        >
                          {text.slice(0, 28)}
                          {text.length > 28 ? "…" : ""}
                        </li>
                      ))
                    )}
                  </ul>
                </nav>
                <div className="min-w-0">
                  <LivePreview
                    markdown={previewMd}
                    contentWidth="narrow"
                    className="!max-w-none !p-0 text-[13px]"
                  />
                  <div className="mt-5 flex flex-wrap gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      className="rounded-full"
                      render={
                        <Link
                          href={`/dashboard/documents/${selected.publicId}`}
                        />
                      }
                    >
                      Im Editor öffnen
                    </Button>
                    {selected.status === "published" && (
                      <Button
                        size="sm"
                        className="rounded-full"
                        onClick={() => setShareOpen(true)}
                      >
                        <Share2 data-icon="inline-start" />
                        Teilen
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {shareOpen && selected.status === "published" && (
              <div className="absolute right-4 top-16 z-20 w-[min(320px,calc(100%-2rem))]">
                <SharePanel
                  shareUrl={shareUrl(selected.publicId)}
                  title={selected.title}
                  isPasswordProtected={selected.isPasswordProtected}
                  visibility={selected.visibility}
                  onClose={() => setShareOpen(false)}
                  manageHref={`/dashboard/documents/${selected.publicId}`}
                />
              </div>
            )}
          </>
        ) : (
          <div className="flex flex-1 items-center justify-center p-6 text-center text-[13px] text-stone-400">
            Wählen Sie ein Dokument zur Vorschau.
          </div>
        )}
      </aside>
    </div>
  );
}
