"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  addProjectMemberAction,
  removeProjectMemberAction,
  updateProjectMemberRoleAction,
} from "@/app/actions/projects";
import type { ProjectMember } from "@/lib/projects/members";

const ROLE_LABELS: Record<string, string> = {
  owner: "Eigentümer",
  editor: "Bearbeiter",
  viewer: "Leser",
};

export function ProjectMembersPanel({
  publicId,
  members,
  canManage,
  teamsEnabled,
}: {
  publicId: string;
  members: ProjectMember[];
  /** Only the owner may change the member list. */
  canManage: boolean;
  teamsEnabled: boolean;
}) {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<"editor" | "viewer">("viewer");
  const [busy, setBusy] = useState(false);

  async function run(fn: () => Promise<{ ok: boolean; error?: string }>, ok: string) {
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
    <section className="mt-6 rounded-xl border border-border p-4">
      <h2 className="mb-1 text-lg font-medium">Mitglieder</h2>
      <p className="mb-4 text-[12px] text-stone-500">
        Bearbeiter dürfen Dokumente in diesem Projekt anlegen und ändern, Leser
        nur ansehen.
      </p>

      <ul className="divide-y divide-stone-100 dark:divide-stone-800">
        {members.map((m) => (
          <li
            key={m.id}
            className="flex flex-wrap items-center gap-3 py-2.5 text-[13px]"
          >
            <div className="min-w-0 flex-1">
              <p className="truncate font-medium text-stone-800 dark:text-stone-100">
                {m.name || m.email}
              </p>
              {m.name && (
                <p className="truncate text-[11px] text-stone-400">{m.email}</p>
              )}
            </div>
            {m.isOwner || !canManage ? (
              <span className="text-[12px] text-stone-500">
                {ROLE_LABELS[m.role] ?? m.role}
              </span>
            ) : (
              <>
                <Select
                  value={m.role}
                  onValueChange={(next) =>
                    void run(
                      () =>
                        updateProjectMemberRoleAction(publicId, m.id, next),
                      "Rolle geändert"
                    )
                  }
                  disabled={busy}
                >
                  <SelectTrigger className="h-8 w-[140px] text-[12px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="editor">Bearbeiter</SelectItem>
                    <SelectItem value="viewer">Leser</SelectItem>
                  </SelectContent>
                </Select>
                <Button
                  size="icon-xs"
                  variant="ghost"
                  disabled={busy}
                  aria-label={`${m.email} entfernen`}
                  onClick={() =>
                    void run(
                      () => removeProjectMemberAction(publicId, m.id),
                      "Mitglied entfernt"
                    )
                  }
                >
                  <Trash2 />
                </Button>
              </>
            )}
          </li>
        ))}
      </ul>

      {canManage &&
        (teamsEnabled ? (
          <form
            className="mt-4 flex flex-wrap items-center gap-2"
            onSubmit={async (e) => {
              e.preventDefault();
              const added = await run(
                () => addProjectMemberAction(publicId, { email, role }),
                "Mitglied hinzugefügt"
              );
              if (added) setEmail("");
            }}
          >
            <Input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="E-Mail des Kontos"
              className="h-9 w-[240px]"
            />
            <Select
              value={role}
              onValueChange={(v) => setRole(v as "editor" | "viewer")}
            >
              <SelectTrigger className="h-9 w-[140px] text-[13px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="editor">Bearbeiter</SelectItem>
                <SelectItem value="viewer">Leser</SelectItem>
              </SelectContent>
            </Select>
            <Button type="submit" size="sm" disabled={busy}>
              Hinzufügen
            </Button>
            <p className="w-full text-[11px] text-stone-400">
              Die Person braucht bereits ein Readlane-Konto mit dieser Adresse.
            </p>
          </form>
        ) : (
          <p className="mt-4 text-[12px] text-stone-500">
            Team-Mitglieder sind Teil von Business.{" "}
            <Link
              href="/dashboard/upgrade"
              className="font-medium text-stone-700 underline-offset-2 hover:underline dark:text-stone-200"
            >
              Tarif ansehen
            </Link>
          </p>
        ))}
    </section>
  );
}
