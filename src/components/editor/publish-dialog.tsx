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
import { Field, FieldGroup, FieldLabel, FieldDescription } from "@/components/ui/field";
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
      ? "Jeder mit dem Link kann das Dokument ohne Passwort öffnen. Es erscheint nicht in einer öffentlichen Liste."
      : state.visibility === "unlisted"
        ? "Nur Personen mit dem langen, geheimen Link können das Dokument öffnen."
        : "Nur Personen mit dem Link und dem korrekten Passwort können das Dokument öffnen.";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
        {showSuccess ? (
          <>
            <DialogHeader>
              <DialogTitle>Erfolgreich veröffentlicht</DialogTitle>
              <DialogDescription>
                Bewahren Sie den Verwaltungslink sicher auf. Er wird nur einmal
                angezeigt.
              </DialogDescription>
            </DialogHeader>

            <div className="flex flex-col gap-4">
              <div className="flex flex-col gap-2">
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
                  Teilen Sie ihn nicht öffentlich.
                </AlertDescription>
              </Alert>

              <div className="flex flex-col gap-2">
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
                  Dokument öffnen
                </Button>
                <Button
                  variant="outline"
                  render={<Link href={result.manageUrl} />}
                >
                  Dokument verwalten
                </Button>
                <Button variant="secondary" onClick={downloadLinks}>
                  <Download data-icon="inline-start" />
                  Links als Textdatei
                </Button>
              </div>
            </div>
          </>
        ) : (
          <>
            <DialogHeader>
              <DialogTitle>
                {mode === "publish" ? "Dokument veröffentlichen" : "Einstellungen"}
              </DialogTitle>
              <DialogDescription>
                Sichtbarkeit, Darstellung und optionale Optionen festlegen.
              </DialogDescription>
            </DialogHeader>

            <FieldGroup>
              <Field>
                <FieldLabel htmlFor="title">Titel</FieldLabel>
                <Input
                  id="title"
                  value={state.title}
                  onChange={(e) => onChange({ title: e.target.value })}
                  placeholder="Dokumenttitel"
                  maxLength={200}
                />
              </Field>

              <Field>
                <FieldLabel htmlFor="description">Beschreibung</FieldLabel>
                <Textarea
                  id="description"
                  value={state.description}
                  onChange={(e) => onChange({ description: e.target.value })}
                  placeholder="Optionale kurze Beschreibung"
                  rows={2}
                  maxLength={500}
                />
              </Field>

              <Field>
                <FieldLabel>Sichtbarkeit</FieldLabel>
                <Select
                  value={state.visibility}
                  onValueChange={(v) =>
                    onChange({ visibility: v as EditorDocumentState["visibility"] })
                  }
                >
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="public">Öffentlich</SelectItem>
                    <SelectItem value="unlisted">Nicht gelistet</SelectItem>
                    <SelectItem value="password">Passwortgeschützt</SelectItem>
                  </SelectContent>
                </Select>
                <FieldDescription>{visibilityHint}</FieldDescription>
              </Field>

              {state.visibility === "password" && (
                <Field>
                  <FieldLabel htmlFor="password">Passwort</FieldLabel>
                  <Input
                    id="password"
                    type="password"
                    autoComplete="new-password"
                    value={state.password}
                    onChange={(e) => onChange({ password: e.target.value })}
                    placeholder={
                      mode === "settings"
                        ? "Leer lassen, um beizubehalten"
                        : "Passwort festlegen"
                    }
                  />
                </Field>
              )}

              <Field>
                <FieldLabel>Status</FieldLabel>
                <Select
                  value={state.status}
                  onValueChange={(v) =>
                    onChange({ status: v as EditorDocumentState["status"] })
                  }
                >
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="published">Veröffentlicht</SelectItem>
                    <SelectItem value="draft">Entwurf</SelectItem>
                    <SelectItem value="archived">Archiviert</SelectItem>
                  </SelectContent>
                </Select>
              </Field>

              <Field>
                <FieldLabel>Theme</FieldLabel>
                <Select
                  value={state.theme}
                  onValueChange={(v) =>
                    onChange({ theme: v as EditorDocumentState["theme"] })
                  }
                >
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="system">System</SelectItem>
                    <SelectItem value="light">Hell</SelectItem>
                    <SelectItem value="dark">Dunkel</SelectItem>
                  </SelectContent>
                </Select>
              </Field>

              <Field>
                <FieldLabel>Lesebreite</FieldLabel>
                <Select
                  value={state.contentWidth}
                  onValueChange={(v) =>
                    onChange({
                      contentWidth: v as EditorDocumentState["contentWidth"],
                    })
                  }
                >
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="narrow">Schmal</SelectItem>
                    <SelectItem value="normal">Normal</SelectItem>
                    <SelectItem value="wide">Breit</SelectItem>
                  </SelectContent>
                </Select>
              </Field>

              <Field>
                <FieldLabel>Schrift</FieldLabel>
                <Select
                  value={state.fontStyle}
                  onValueChange={(v) =>
                    onChange({ fontStyle: v as EditorDocumentState["fontStyle"] })
                  }
                >
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="sans">Sans-Serif</SelectItem>
                    <SelectItem value="serif">Serif</SelectItem>
                  </SelectContent>
                </Select>
              </Field>

              <Field>
                <FieldLabel>Ablaufzeit</FieldLabel>
                <Select
                  value={state.expiryPreset}
                  onValueChange={(v) =>
                    onChange({
                      expiryPreset: v as EditorDocumentState["expiryPreset"],
                    })
                  }
                >
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="never">Nie</SelectItem>
                    <SelectItem value="24h">Nach 24 Stunden</SelectItem>
                    <SelectItem value="7d">Nach 7 Tagen</SelectItem>
                    <SelectItem value="30d">Nach 30 Tagen</SelectItem>
                    <SelectItem value="custom">Benutzerdefiniertes Datum</SelectItem>
                  </SelectContent>
                </Select>
              </Field>

              {state.expiryPreset === "custom" && (
                <Field>
                  <FieldLabel htmlFor="expiry">Ablaufdatum</FieldLabel>
                  <Input
                    id="expiry"
                    type="datetime-local"
                    value={state.customExpiryDate}
                    onChange={(e) =>
                      onChange({ customExpiryDate: e.target.value })
                    }
                  />
                </Field>
              )}

              <div className="flex items-center justify-between gap-4 rounded-lg border border-border px-3 py-2">
                <div>
                  <p className="text-sm font-medium">Inhaltsverzeichnis</p>
                  <p className="text-xs text-muted-foreground">
                    Automatisch aus Überschriften
                  </p>
                </div>
                <Switch
                  checked={state.showTableOfContents}
                  onCheckedChange={(v) => onChange({ showTableOfContents: v })}
                />
              </div>

              <div className="flex items-center justify-between gap-4 rounded-lg border border-border px-3 py-2">
                <div>
                  <p className="text-sm font-medium">Zeilennummern</p>
                  <p className="text-xs text-muted-foreground">In Codeblöcken</p>
                </div>
                <Switch
                  checked={state.showCodeLineNumbers}
                  onCheckedChange={(v) => onChange({ showCodeLineNumbers: v })}
                />
              </div>

              {mode === "publish" && (
                <Alert>
                  <ShieldAlert />
                  <AlertTitle>Wichtige Hinweise</AlertTitle>
                  <AlertDescription>
                    <ul className="mt-1 list-disc pl-4 text-sm">
                      <li>{visibilityHint}</li>
                      <li>
                        Nach der Veröffentlichung erhalten Sie einen geheimen
                        Verwaltungslink — bewahren Sie ihn sicher auf.
                      </li>
                      {state.visibility === "password" && (
                        <li>Ein Passwort ist erforderlich, um das Dokument zu öffnen.</li>
                      )}
                    </ul>
                  </AlertDescription>
                </Alert>
              )}

              {shareUrl && mode === "settings" && (
                <div className="flex flex-col gap-2">
                  <p className="text-sm font-medium">Share-Link</p>
                  <code className="break-all rounded-md bg-muted px-3 py-2 text-xs">
                    {shareUrl}
                  </code>
                  <CopyButton value={shareUrl} />
                </div>
              )}
            </FieldGroup>

            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => onOpenChange(false)}
                type="button"
              >
                Abbrechen
              </Button>
              <Button
                type="button"
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
                    : "Übernehmen & speichern"}
              </Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
