"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { CopyButton } from "@/components/editor/copy-button";
import {
  addDomainAction,
  removeDomainAction,
  updateDomainBrandingAction,
  verifyDomainAction,
} from "@/app/actions/domains";

export interface DomainRow {
  publicId: string;
  host: string;
  projectName: string | null;
  verified: boolean;
  verificationToken: string;
  brandName: string | null;
  brandColor: string | null;
  brandLogoUrl: string | null;
}

export function DomainsPanel({
  domains,
  projects,
  enabled,
  verificationPrefix,
}: {
  domains: DomainRow[];
  projects: Array<{ publicId: string; name: string }>;
  enabled: boolean;
  verificationPrefix: string;
}) {
  const router = useRouter();
  const [host, setHost] = useState("");
  const [projectId, setProjectId] = useState("none");
  const [busy, setBusy] = useState(false);

  if (!enabled) {
    return (
      <p className="text-[13px] text-stone-500">
        Eigene Domains und eigenes Branding sind Teil von Business.{" "}
        <Link
          href="/dashboard/upgrade"
          className="font-medium text-stone-700 underline-offset-2 hover:underline dark:text-stone-200"
        >
          Tarif ansehen
        </Link>
      </p>
    );
  }

  async function run(
    fn: () => Promise<{ ok: boolean; error?: string }>,
    ok: string
  ) {
    setBusy(true);
    const res = await fn();
    setBusy(false);
    if (!res.ok) {
      toast.error(res.error ?? "Fehlgeschlagen");
      return false;
    }
    toast.success(ok);
    router.refresh();
    return true;
  }

  return (
    <div className="flex flex-col gap-4">
      {domains.map((d) => (
        <div
          key={d.publicId}
          className="rounded-xl border border-border p-4 text-[13px]"
        >
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-medium text-stone-800 dark:text-stone-100">
              {d.host}
            </span>
            <span
              className={
                d.verified
                  ? "rounded-full bg-emerald-50 px-2 py-0.5 text-[11px] text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300"
                  : "rounded-full bg-amber-50 px-2 py-0.5 text-[11px] text-amber-700 dark:bg-amber-950 dark:text-amber-300"
              }
            >
              {d.verified ? "Verifiziert" : "Nicht verifiziert"}
            </span>
            <span className="text-[11px] text-stone-400">
              {d.projectName ? `Projekt: ${d.projectName}` : "Gesamtes Konto"}
            </span>
            <div className="ml-auto flex gap-2">
              {!d.verified && (
                <Button
                  size="sm"
                  variant="outline"
                  disabled={busy}
                  onClick={() =>
                    void run(
                      () => verifyDomainAction(d.publicId),
                      "Domain verifiziert"
                    )
                  }
                >
                  Prüfen
                </Button>
              )}
              <Button
                size="sm"
                variant="ghost"
                disabled={busy}
                onClick={() => {
                  if (!confirm(`${d.host} entfernen?`)) return;
                  void run(
                    () => removeDomainAction(d.publicId),
                    "Domain entfernt"
                  );
                }}
              >
                Entfernen
              </Button>
            </div>
          </div>

          {!d.verified && (
            <div className="mt-3 rounded-lg bg-stone-50 p-3 dark:bg-stone-900">
              <p className="text-[12px] text-stone-500">
                TXT-Eintrag anlegen und danach auf Prüfen klicken. Die Domain
                selbst muss per CNAME auf diese Anwendung zeigen.
              </p>
              <div className="mt-2 flex flex-wrap items-center gap-2 font-mono text-[11px]">
                <code className="rounded bg-white px-2 py-1 ring-1 ring-stone-200 dark:bg-stone-950 dark:ring-stone-800">
                  {verificationPrefix}.{d.host}
                </code>
                <code className="min-w-0 flex-1 truncate rounded bg-white px-2 py-1 ring-1 ring-stone-200 dark:bg-stone-950 dark:ring-stone-800">
                  {d.verificationToken}
                </code>
                <CopyButton value={d.verificationToken} label="" />
              </div>
            </div>
          )}

          <BrandingFields
            domain={d}
            busy={busy}
            onSave={(values) =>
              run(
                () => updateDomainBrandingAction(d.publicId, values),
                "Branding gespeichert"
              )
            }
          />
        </div>
      ))}

      <form
        className="flex flex-wrap items-end gap-2"
        onSubmit={async (e) => {
          e.preventDefault();
          const added = await run(
            () =>
              addDomainAction({
                host,
                projectPublicId: projectId === "none" ? null : projectId,
              }),
            "Domain angelegt — jetzt TXT-Eintrag setzen"
          );
          if (added) setHost("");
        }}
      >
        <div>
          <label className="mb-1 block text-[11px] text-stone-400">Domain</label>
          <Input
            required
            value={host}
            onChange={(e) => setHost(e.target.value)}
            placeholder="docs.example.com"
            className="h-9 w-[240px]"
          />
        </div>
        <div>
          <label className="mb-1 block text-[11px] text-stone-400">Gilt für</label>
          <Select value={projectId} onValueChange={(v) => setProjectId(v ?? "none")}>
            <SelectTrigger className="h-9 w-[180px] text-[13px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="none">Gesamtes Konto</SelectItem>
              {projects.map((p) => (
                <SelectItem key={p.publicId} value={p.publicId}>
                  {p.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <Button type="submit" size="sm" className="h-9" disabled={busy}>
          Domain hinzufügen
        </Button>
      </form>
    </div>
  );
}

function BrandingFields({
  domain,
  busy,
  onSave,
}: {
  domain: DomainRow;
  busy: boolean;
  onSave: (values: {
    brandName: string;
    brandColor: string;
    brandLogoUrl: string;
  }) => void;
}) {
  const [values, setValues] = useState({
    brandName: domain.brandName ?? "",
    brandColor: domain.brandColor ?? "",
    brandLogoUrl: domain.brandLogoUrl ?? "",
  });

  return (
    <div className="mt-3 flex flex-wrap items-end gap-2">
      <div>
        <label className="mb-1 block text-[11px] text-stone-400">
          Anzeigename
        </label>
        <Input
          value={values.brandName}
          onChange={(e) =>
            setValues((v) => ({ ...v, brandName: e.target.value }))
          }
          placeholder={domain.host}
          className="h-9 w-[180px]"
        />
      </div>
      <div>
        <label className="mb-1 block text-[11px] text-stone-400">
          Logo-URL (https)
        </label>
        <Input
          value={values.brandLogoUrl}
          onChange={(e) =>
            setValues((v) => ({ ...v, brandLogoUrl: e.target.value }))
          }
          placeholder="https://…/logo.svg"
          className="h-9 w-[220px]"
        />
      </div>
      <div>
        <label className="mb-1 block text-[11px] text-stone-400">Akzent</label>
        <Input
          value={values.brandColor}
          onChange={(e) =>
            setValues((v) => ({ ...v, brandColor: e.target.value }))
          }
          placeholder="#1d4ed8"
          className="h-9 w-[120px]"
        />
      </div>
      <Button
        size="sm"
        variant="outline"
        className="h-9"
        disabled={busy}
        onClick={() => onSave(values)}
      >
        Branding speichern
      </Button>
    </div>
  );
}
