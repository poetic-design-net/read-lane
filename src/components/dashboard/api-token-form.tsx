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
import { createApiTokenAction } from "@/app/actions/projects";

type Scope = "full" | "project_read" | "project_write";

export function ApiTokenForm({
  projects,
  enabled,
}: {
  projects: Array<{ publicId: string; name: string }>;
  enabled: boolean;
}) {
  const router = useRouter();
  const [name, setName] = useState("");
  const [projectId, setProjectId] = useState<string>("none");
  const [scope, setScope] = useState<Scope>("full");
  const [busy, setBusy] = useState(false);
  // Shown once — only the hash is stored.
  const [issued, setIssued] = useState<string | null>(null);

  if (!enabled) {
    return (
      <p className="text-[13px] text-stone-500">
        API- und CI/CD-Tokens sind Teil von Business.{" "}
        <Link
          href="/dashboard/upgrade"
          className="font-medium text-stone-700 underline-offset-2 hover:underline dark:text-stone-200"
        >
          Tarif ansehen
        </Link>
      </p>
    );
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    const res = await createApiTokenAction({
      name,
      projectId: projectId === "none" ? null : projectId,
      scope,
    });
    setBusy(false);
    if (!res.ok || !res.data) {
      toast.error(res.ok ? "Token konnte nicht erstellt werden" : res.error);
      return;
    }
    setIssued(res.data.token);
    setName("");
    router.refresh();
  }

  return (
    <div>
      <form className="flex flex-wrap items-end gap-2" onSubmit={submit}>
        <div>
          <label className="mb-1 block text-[11px] text-stone-400">Name</label>
          <Input
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="CI Deploy"
            className="h-9 w-[200px]"
          />
        </div>
        <div>
          <label className="mb-1 block text-[11px] text-stone-400">
            Projekt
          </label>
          <Select
            value={projectId}
            onValueChange={(v) => {
              setProjectId(v ?? "none");
              if (!v || v === "none") setScope("full");
            }}
          >
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
        <div>
          <label className="mb-1 block text-[11px] text-stone-400">Rechte</label>
          <Select
            value={scope}
            onValueChange={(v) => setScope(v as Scope)}
            disabled={projectId === "none"}
          >
            <SelectTrigger className="h-9 w-[160px] text-[13px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="full">Voll</SelectItem>
              <SelectItem value="project_write">Lesen und schreiben</SelectItem>
              <SelectItem value="project_read">Nur lesen</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <Button type="submit" size="sm" className="h-9" disabled={busy}>
          Token erstellen
        </Button>
      </form>

      {issued && (
        <div className="mt-3 rounded-xl bg-stone-50 p-3.5 ring-1 ring-stone-100 dark:bg-stone-900 dark:ring-stone-800">
          <p className="text-[12px] font-medium text-stone-800 dark:text-stone-100">
            Token wird nur einmal angezeigt
          </p>
          <div className="mt-2 flex items-center gap-2">
            <code className="min-w-0 flex-1 truncate rounded bg-stone-900 px-2 py-1.5 font-mono text-[12px] text-stone-100">
              {issued}
            </code>
            <CopyButton value={issued} />
          </div>
        </div>
      )}
    </div>
  );
}
