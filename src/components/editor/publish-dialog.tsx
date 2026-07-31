"use client";

import Link from "next/link";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Field, FieldLabel, FieldDescription } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { CopyButton } from "./copy-button";
import type { EditorDocumentState } from "./document-editor";
import { Download, ExternalLink, ShieldAlert } from "lucide-react";

interface PublishDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  state: EditorDocumentState;
  onChange: (patch: Partial<EditorDocumentState>) => void;
  mode: "publish" | "settings";
  onSubmit: () => Promise<void>;
  saving: boolean;
  result: {
    shareUrl: string;
    manageUrl: string;
    managementToken: string;
  } | null;
  shareUrl?: string;
}

export function PublishDialog({
  open,
  onOpenChange,
  state,
  onChange,
  mode,
  onSubmit,
  saving,
  result,
  shareUrl,
}: PublishDialogProps) {
  const showSuccess = mode === "publish" && result;

  function downloadLinks() {
    if (!result) return;
    const text = `Share-Link:\n${result.shareUrl}\n\nVerwaltungslink (GEHEIM halten):\n${result.manageUrl}\n`;
    const blob = new Blob([text], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "readlane-links.txt";
    a.click();
    URL.revokeObjectURL(url);
  }

  const visibilityHint =
    state.visibility === "public"
      ? "Jeder mit dem Link kann öffnen (nicht gelistet)."
      : state.visibility === "unlisted"
        ? "Nur mit dem geheimen Link erreichbar."
        : "Link + Passwort erforderlich.";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[min(90vh,640px)] gap-0 overflow-hidden p-0 sm:max-w-xl">
        {showSuccess ? (
          <div className="flex max-h-[min(90vh,640px)] flex-col gap-4 overflow-y-auto p-5 sm:p-6">
            <DialogHeader>
              <DialogTitle>Erfolgreich veröffentlicht</DialogTitle>
              <DialogDescription>
                Bewahren Sie den Verwaltungslink sicher auf. Er wird nur einmal
                angezeigt.
              </DialogDescription>
            </DialogHeader>

            <div className="flex flex-col gap-3">
              <div className="flex flex-col gap-1.5">
                <p className="text-sm font-medium">Share-Link</p>
                <code className="break-all rounded-md bg-muted px-3 py-2 text-xs">
                  {result.shareUrl}
                </code>
                <CopyButton value={result.shareUrl} label="Share-Link kopieren" />
              </div>

              <Alert>
                <ShieldAlert />
                <AlertTitle>Vertraulicher Verwaltungslink</AlertTitle>
                <AlertDescription>
                  Wer diesen Link hat, kann das Dokument bearbeiten oder löschen.
                </AlertDescription>
              </Alert>

              <div className="flex flex-col gap-1.5">
                <p className="text-sm font-medium">Verwaltungslink</p>
                <code className="break-all rounded-md bg-muted px-3 py-2 text-xs">
                  {result.manageUrl}
                </code>
                <CopyButton
                  value={result.manageUrl}
                  label="Verwaltungslink kopieren"
                />
              </div>

              <div className="flex flex-wrap gap-2">
                <Button render={<Link href={result.shareUrl} target="_blank" />}>
                  <ExternalLink data-icon="inline-start" />
                  Öffnen
                </Button>
                <Button
                  variant="outline"
                  render={<Link href={result.manageUrl} />}
                >
                  Verwalten
                </Button>
                <Button variant="secondary" onClick={downloadLinks}>
                  <Download data-icon="inline-start" />
                  Links speichern
                </Button>
              </div>
            </div>
          </div>
        ) : (
          <>
            <div className="border-b border-border px-5 py-4 sm:px-6">
              <DialogHeader className="gap-1">
                <DialogTitle className="text-base">
                  {mode === "publish"
                    ? "Dokument veröffentlichen"
                    : "Einstellungen"}
                </DialogTitle>
                <DialogDescription className="text-[13px]">
                  Sichtbarkeit und Darstellung — kompakt anpassbar.
                </DialogDescription>
              </DialogHeader>
            </div>

            <div className="max-h-[min(60vh,480px)] overflow-y-auto px-5 py-4 sm:px-6">
              <div className="flex flex-col gap-3">
                {/* Title + description compact */}
                <Field className="gap-1.5">
                  <FieldLabel htmlFor="title" className="text-[12px]">
                    Titel
                  </FieldLabel>
                  <Input
                    id="title"
                    value={state.title}
                    onChange={(e) => onChange({ title: e.target.value })}
                    placeholder="Dokumenttitel"
                    maxLength={200}
                    className="h-8"
                  />
                </Field>

                <Field className="gap-1.5">
                  <FieldLabel htmlFor="description" className="text-[12px]">
                    Beschreibung
                  </FieldLabel>
                  <Textarea
                    id="description"
                    value={state.description}
                    onChange={(e) => onChange({ description: e.target.value })}
                    placeholder="Optional"
                    rows={2}
                    maxLength={500}
                    className="min-h-0 resize-none text-sm"
                  />
                </Field>

                {/* 2-col grid for selects */}
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <Field className="gap-1.5">
                    <FieldLabel className="text-[12px]">Sichtbarkeit</FieldLabel>
                    <Select
                      value={state.visibility}
                      onValueChange={(v) =>
                        onChange({
                          visibility: v as EditorDocumentState["visibility"],
                        })
                      }
                    >
                      <SelectTrigger className="h-8 w-full">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="public">Öffentlich</SelectItem>
                        <SelectItem value="unlisted">Nicht gelistet</SelectItem>
                        <SelectItem value="password">Passwort</SelectItem>
                      </SelectContent>
                    </Select>
                  </Field>

                  <Field className="gap-1.5">
                    <FieldLabel className="text-[12px]">Status</FieldLabel>
                    <Select
                      value={state.status}
                      onValueChange={(v) =>
                        onChange({
                          status: v as EditorDocumentState["status"],
                        })
                      }
                    >
                      <SelectTrigger className="h-8 w-full">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="published">Veröffentlicht</SelectItem>
                        <SelectItem value="draft">Entwurf</SelectItem>
                        <SelectItem value="archived">Archiviert</SelectItem>
                      </SelectContent>
                    </Select>
                  </Field>

                  <Field className="gap-1.5">
                    <FieldLabel className="text-[12px]">Theme</FieldLabel>
                    <Select
                      value={state.theme}
                      onValueChange={(v) =>
                        onChange({ theme: v as EditorDocumentState["theme"] })
                      }
                    >
                      <SelectTrigger className="h-8 w-full">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="system">System</SelectItem>
                        <SelectItem value="light">Hell</SelectItem>
                        <SelectItem value="dark">Dunkel</SelectItem>
                      </SelectContent>
                    </Select>
                  </Field>

                  <Field className="gap-1.5">
                    <FieldLabel className="text-[12px]">Lesebreite</FieldLabel>
                    <Select
                      value={state.contentWidth}
                      onValueChange={(v) =>
                        onChange({
                          contentWidth:
                            v as EditorDocumentState["contentWidth"],
                        })
                      }
                    >
                      <SelectTrigger className="h-8 w-full">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="narrow">Schmal</SelectItem>
                        <SelectItem value="normal">Normal</SelectItem>
                        <SelectItem value="wide">Breit</SelectItem>
                      </SelectContent>
                    </Select>
                  </Field>

                  <Field className="gap-1.5">
                    <FieldLabel className="text-[12px]">Schrift</FieldLabel>
                    <Select
                      value={state.fontStyle}
                      onValueChange={(v) =>
                        onChange({
                          fontStyle: v as EditorDocumentState["fontStyle"],
                        })
                      }
                    >
                      <SelectTrigger className="h-8 w-full">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="sans">Sans</SelectItem>
                        <SelectItem value="serif">Serif</SelectItem>
                      </SelectContent>
                    </Select>
                  </Field>

                  <Field className="gap-1.5">
                    <FieldLabel className="text-[12px]">Ablaufzeit</FieldLabel>
                    <Select
                      value={state.expiryPreset}
                      onValueChange={(v) =>
                        onChange({
                          expiryPreset:
                            v as EditorDocumentState["expiryPreset"],
                        })
                      }
                    >
                      <SelectTrigger className="h-8 w-full">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="never">Nie</SelectItem>
                        <SelectItem value="24h">24 Stunden</SelectItem>
                        <SelectItem value="7d">7 Tage</SelectItem>
                        <SelectItem value="30d">30 Tage</SelectItem>
                        <SelectItem value="custom">Datum…</SelectItem>
                      </SelectContent>
                    </Select>
                  </Field>
                </div>

                <p className="text-[11px] leading-snug text-muted-foreground">
                  {visibilityHint}
                </p>

                {state.visibility === "password" && (
                  <Field className="gap-1.5">
                    <FieldLabel htmlFor="password" className="text-[12px]">
                      Passwort
                    </FieldLabel>
                    <Input
                      id="password"
                      type="password"
                      autoComplete="new-password"
                      value={state.password}
                      onChange={(e) => onChange({ password: e.target.value })}
                      placeholder={
                        mode === "settings"
                          ? "Leer lassen = beibehalten"
                          : "Passwort"
                      }
                      className="h-8"
                    />
                  </Field>
                )}

                {state.expiryPreset === "custom" && (
                  <Field className="gap-1.5">
                    <FieldLabel htmlFor="expiry" className="text-[12px]">
                      Ablaufdatum
                    </FieldLabel>
                    <Input
                      id="expiry"
                      type="datetime-local"
                      value={state.customExpiryDate}
                      onChange={(e) =>
                        onChange({ customExpiryDate: e.target.value })
                      }
                      className="h-8"
                    />
                  </Field>
                )}

                {/* Switches side by side */}
                <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                  <div className="flex items-center justify-between gap-3 rounded-lg border border-border px-2.5 py-2">
                    <div className="min-w-0">
                      <p className="text-[12px] font-medium leading-tight">
                        Inhaltsverzeichnis
                      </p>
                      <p className="text-[10px] text-muted-foreground">
                        Aus Überschriften
                      </p>
                    </div>
                    <Switch
                      checked={state.showTableOfContents}
                      onCheckedChange={(v) =>
                        onChange({ showTableOfContents: v })
                      }
                    />
                  </div>
                  <div className="flex items-center justify-between gap-3 rounded-lg border border-border px-2.5 py-2">
                    <div className="min-w-0">
                      <p className="text-[12px] font-medium leading-tight">
                        Zeilennummern
                      </p>
                      <p className="text-[10px] text-muted-foreground">
                        In Codeblöcken
                      </p>
                    </div>
                    <Switch
                      checked={state.showCodeLineNumbers}
                      onCheckedChange={(v) =>
                        onChange({ showCodeLineNumbers: v })
                      }
                    />
                  </div>
                </div>

                {mode === "publish" && (
                  <p className="rounded-lg bg-muted/60 px-2.5 py-2 text-[11px] leading-snug text-muted-foreground">
                    Nach dem Veröffentlichen erhalten Sie Share- und
                    Verwaltungslink. Den Verwaltungslink geheim halten.
                  </p>
                )}

                {shareUrl && mode === "settings" && (
                  <div className="flex items-center gap-2 rounded-lg border border-border px-2.5 py-2">
                    <code className="min-w-0 flex-1 truncate text-[11px] text-muted-foreground">
                      {shareUrl}
                    </code>
                    <CopyButton value={shareUrl} label="" />
                  </div>
                )}
              </div>
            </div>

            <DialogFooter className="border-t border-border px-5 py-3 sm:px-6">
              <Button
                variant="outline"
                size="sm"
                onClick={() => onOpenChange(false)}
                type="button"
              >
                Abbrechen
              </Button>
              <Button
                type="button"
                size="sm"
                disabled={
                  saving ||
                  !state.markdownContent.trim() ||
                  (state.visibility === "password" &&
                    mode === "publish" &&
                    !state.password)
                }
                onClick={() => void onSubmit()}
              >
                {saving
                  ? "Bitte warten…"
                  : mode === "publish"
                    ? "Veröffentlichen"
                    : "Speichern"}
              </Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
