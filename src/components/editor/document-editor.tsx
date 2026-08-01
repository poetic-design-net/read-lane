"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  FileUp,
  Trash2,
  FileText,
  Settings2,
  Send,
  Save,
  AlertTriangle,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { LivePreview } from "./live-preview";
import { PublishDialog } from "./publish-dialog";
import { EXAMPLE_MARKDOWN } from "@/lib/markdown/example";
import { appConfig } from "@/lib/config";
import type {
  ContentWidth,
  DocumentStatus,
  FontStyle,
  RendererType,
  Theme,
  Visibility,
} from "@/types/document";
import {
  publishDocumentAction,
  updateManagedDocumentAction,
  updateDashboardDocumentAction,
} from "@/app/actions/documents";
import { format } from "date-fns";
import { de } from "date-fns/locale";

export interface EditorDocumentState {
  title: string;
  description: string;
  markdownContent: string;
  visibility: Visibility;
  status: DocumentStatus;
  password: string;
  theme: Theme;
  contentWidth: ContentWidth;
  fontStyle: FontStyle;
  showTableOfContents: boolean;
  showCodeLineNumbers: boolean;
  expiryPreset: "never" | "24h" | "7d" | "30d" | "custom";
  customExpiryDate: string;
  projectId?: string | null;
  /** Set for uploaded formats — text stays "markdown" with no file attached. */
  rendererType?: RendererType;
  fileId?: string | null;
  sourceFilename?: string | null;
  /** Short-lived URL for previewing pdf/image before publishing. */
  previewUrl?: string | null;
  fileSize?: number | null;
}

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
  showTableOfContents: false,
  showCodeLineNumbers: false,
  expiryPreset: "never",
  customExpiryDate: "",
};

interface DocumentEditorProps {
  mode: "create" | "manage" | "dashboard";
  initial?: Partial<EditorDocumentState>;
  managementToken?: string;
  publicId?: string;
  lastSavedAt?: Date | string | null;
  shareUrl?: string;
}

export function DocumentEditor({
  mode,
  initial,
  managementToken,
  publicId,
  lastSavedAt,
  shareUrl,
}: DocumentEditorProps) {
  const [state, setState] = useState<EditorDocumentState>({
    ...defaultState,
    ...initial,
  });
  const [dirty, setDirty] = useState(false);
  const [saving, setSaving] = useState(false);
  const [publishOpen, setPublishOpen] = useState(false);
  const [savedAt, setSavedAt] = useState<Date | null>(
    lastSavedAt ? new Date(lastSavedAt) : null
  );
  const [publishResult, setPublishResult] = useState<{
    shareUrl: string;
    manageUrl: string;
    managementToken: string;
  } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [dragOver, setDragOver] = useState(false);

  const update = useCallback((patch: Partial<EditorDocumentState>) => {
    setState((s) => ({ ...s, ...patch }));
    setDirty(true);
  }, []);

  useEffect(() => {
    function onBeforeUnload(e: BeforeUnloadEvent) {
      if (dirty) {
        e.preventDefault();
        e.returnValue = "";
      }
    }
    window.addEventListener("beforeunload", onBeforeUnload);
    return () => window.removeEventListener("beforeunload", onBeforeUnload);
  }, [dirty]);

  const validateFile = (file: File): string | null => {
    const name = file.name.toLowerCase();
    const okExt = appConfig.allowedExtensions.some((ext) => name.endsWith(ext));
    if (!okExt) return "Nur .md, .markdown oder .txt Dateien sind erlaubt.";
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
    update({
      markdownContent: text,
      title: state.title || baseTitle,
    });
    toast.success("Datei geladen");
  };

  const onDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files?.[0];
    if (file) await loadFile(file);
  };

  const handleSave = async () => {
    if (!state.markdownContent.trim()) {
      toast.error("Dokument darf nicht leer sein.");
      return;
    }
    setSaving(true);
    try {
      if (mode === "manage" && managementToken) {
        const res = await updateManagedDocumentAction(managementToken, {
          title: state.title || "Untitled",
          description: state.description || null,
          markdownContent: state.markdownContent,
          visibility: state.visibility,
          status: state.status,
          password: state.password || undefined,
          clearPassword:
            state.visibility !== "password" && !state.password
              ? true
              : undefined,
          theme: state.theme,
          contentWidth: state.contentWidth,
          fontStyle: state.fontStyle,
          showTableOfContents: state.showTableOfContents,
          showCodeLineNumbers: state.showCodeLineNumbers,
          expiryPreset: state.expiryPreset,
          customExpiryDate: state.customExpiryDate || null,
        });
        if (!res.ok) {
          toast.error(res.error);
          return;
        }
        setDirty(false);
        setSavedAt(new Date());
        toast.success("Gespeichert");
      } else if (mode === "dashboard" && publicId) {
        const res = await updateDashboardDocumentAction(publicId, {
          title: state.title || "Untitled",
          description: state.description || null,
          markdownContent: state.markdownContent,
          visibility: state.visibility,
          status: state.status,
          password: state.password || undefined,
          clearPassword:
            state.visibility !== "password" ? true : undefined,
          theme: state.theme,
          contentWidth: state.contentWidth,
          fontStyle: state.fontStyle,
          showTableOfContents: state.showTableOfContents,
          showCodeLineNumbers: state.showCodeLineNumbers,
        });
        if (!res.ok) {
          toast.error(res.error);
          return;
        }
        setDirty(false);
        setSavedAt(new Date());
        toast.success("Gespeichert");
      }
    } finally {
      setSaving(false);
    }
  };

  const handlePublish = async (payload: EditorDocumentState) => {
    setSaving(true);
    try {
      const res = await publishDocumentAction({
        title: payload.title || "Untitled",
        description: payload.description || null,
        markdownContent: payload.markdownContent,
        visibility: payload.visibility,
        status: payload.status,
        password: payload.password || null,
        theme: payload.theme,
        contentWidth: payload.contentWidth,
        fontStyle: payload.fontStyle,
        showTableOfContents: payload.showTableOfContents,
        showCodeLineNumbers: payload.showCodeLineNumbers,
        expiryPreset: payload.expiryPreset,
        customExpiryDate: payload.customExpiryDate || null,
        projectId: payload.projectId,
      });
      if (!res.ok || !res.data) {
        toast.error(res.ok === false ? res.error : "Fehler");
        return;
      }
      setPublishResult({
        shareUrl: res.data.shareUrl,
        manageUrl: res.data.manageUrl,
        managementToken: res.data.managementToken,
      });
      setDirty(false);
      toast.success("Dokument veröffentlicht");
    } finally {
      setSaving(false);
    }
  };

  const toolbar = useMemo(
    () => (
      <div className="flex flex-wrap items-center gap-2">
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
          type="button"
          variant="outline"
          size="sm"
          onClick={() => fileInputRef.current?.click()}
        >
          <FileUp data-icon="inline-start" />
          Hochladen
        </Button>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => update({ markdownContent: EXAMPLE_MARKDOWN, title: state.title || "Beispieldokument" })}
        >
          <FileText data-icon="inline-start" />
          Beispiel
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => {
            update({ markdownContent: "", title: "", description: "" });
          }}
        >
          <Trash2 data-icon="inline-start" />
          Leeren
        </Button>
        <div className="ml-auto flex flex-wrap items-center gap-2">
          {dirty && (
            <Badge variant="secondary" className="gap-1">
              <AlertTriangle className="size-3" />
              Ungespeichert
            </Badge>
          )}
          {savedAt && mode !== "create" && (
            <span className="text-xs text-muted-foreground">
              Gespeichert{" "}
              {format(savedAt, "dd.MM.yyyy HH:mm", { locale: de })}
            </span>
          )}
          {mode === "create" ? (
            <Button
              type="button"
              size="sm"
              onClick={() => setPublishOpen(true)}
              disabled={!state.markdownContent.trim() || saving}
            >
              <Send data-icon="inline-start" />
              Veröffentlichen
            </Button>
          ) : (
            <>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setPublishOpen(true)}
              >
                <Settings2 data-icon="inline-start" />
                Einstellungen
              </Button>
              <Button
                type="button"
                size="sm"
                onClick={() => void handleSave()}
                disabled={saving || !dirty}
              >
                <Save data-icon="inline-start" />
                {saving ? "Speichern…" : "Speichern"}
              </Button>
            </>
          )}
        </div>
      </div>
    ),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [dirty, savedAt, saving, state.markdownContent, mode]
  );

  return (
    <div className="flex flex-col gap-4">
      {toolbar}

      {/* Desktop split */}
      <div
        className={`hidden md:grid md:grid-cols-2 md:gap-0 md:rounded-xl md:border md:border-border md:overflow-hidden min-h-[28rem] ${
          dragOver ? "ring-2 ring-ring" : ""
        }`}
        onDragOver={(e) => {
          e.preventDefault();
          setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={onDrop}
      >
        <div className="border-r border-border bg-muted/20">
          <label htmlFor="md-editor" className="sr-only">
            Markdown-Inhalt
          </label>
          <Textarea
            id="md-editor"
            value={state.markdownContent}
            onChange={(e) => update({ markdownContent: e.target.value })}
            placeholder="Markdown hier einfügen oder Datei ablegen…"
            className="min-h-[28rem] h-full resize-none rounded-none border-0 bg-transparent font-mono text-sm focus-visible:ring-0"
          />
        </div>
        <div className="overflow-auto bg-background max-h-[40rem]">
          <LivePreview
            markdown={state.markdownContent}
            contentWidth={state.contentWidth}
            fontStyle={state.fontStyle}
          />
        </div>
      </div>

      {/* Mobile tabs */}
      <div className="md:hidden">
        <Tabs defaultValue="editor">
          <TabsList className="w-full">
            <TabsTrigger value="editor" className="flex-1">
              Editor
            </TabsTrigger>
            <TabsTrigger value="preview" className="flex-1">
              Vorschau
            </TabsTrigger>
          </TabsList>
          <TabsContent value="editor" className="mt-2">
            <Textarea
              value={state.markdownContent}
              onChange={(e) => update({ markdownContent: e.target.value })}
              placeholder="Markdown hier einfügen…"
              className="min-h-[20rem] font-mono text-sm"
              onDragOver={(e) => e.preventDefault()}
              onDrop={onDrop}
            />
          </TabsContent>
          <TabsContent value="preview" className="mt-2 rounded-xl border border-border">
            <LivePreview
              markdown={state.markdownContent}
              contentWidth={state.contentWidth}
              fontStyle={state.fontStyle}
            />
          </TabsContent>
        </Tabs>
      </div>

      <PublishDialog
        open={publishOpen}
        onOpenChange={setPublishOpen}
        state={state}
        onChange={update}
        mode={mode === "create" ? "publish" : "settings"}
        onSubmit={async () => {
          if (mode === "create") {
            await handlePublish(state);
          } else {
            await handleSave();
            setPublishOpen(false);
          }
        }}
        saving={saving}
        result={publishResult}
        shareUrl={shareUrl}
      />
    </div>
  );
}
