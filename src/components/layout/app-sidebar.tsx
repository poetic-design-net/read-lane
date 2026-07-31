import Link from "next/link";
import { Plus } from "lucide-react";
import { cn } from "@/lib/utils";
import type { ProjectSummary } from "@/types/document";
import { logoutAction } from "@/app/actions/auth";
import { Button } from "@/components/ui/button";
import { Logo } from "@/components/brand/logo";
import { CreateProjectButton } from "@/components/dashboard/create-project-button";


const tones = [
  "from-stone-700 to-stone-900",
  "from-amber-200 to-orange-300",
  "from-emerald-200 to-teal-300",
  "from-violet-300 to-indigo-400",
  "from-sky-200 to-blue-400",
  "from-rose-200 to-pink-300",
];

export function AppSidebar({
  projects,
  user,
  activeProjectId,
}: {
  projects: ProjectSummary[];
  user: { name: string | null; email: string };
  activeProjectId?: string;
}) {
  return (
    <aside className="flex h-full w-[240px] shrink-0 flex-col border-r border-stone-200/80 bg-[#f6f5f3] dark:border-stone-800 dark:bg-stone-900/70">
      <div className="flex items-center gap-2.5 border-b border-stone-200/70 px-4 py-4 dark:border-stone-800">
        <Link href="/dashboard" className="inline-flex items-center">
          <Logo variant="full" size="md" />
        </Link>
      </div>


      <div className="flex flex-1 flex-col gap-4 overflow-y-auto p-3">
        <CreateProjectButton variant="sidebar" />

        <div>
          <p className="mb-2 px-2 text-[10px] font-medium uppercase tracking-[0.14em] text-stone-400">
            Projekte
          </p>
          {projects.length === 0 ? (
            <p className="px-2 text-[12px] text-stone-400">
              Noch keine Projekte. Erstellen Sie Ihr erstes.
            </p>
          ) : (
            <ul className="flex flex-col gap-0.5">
              {projects.map((p, i) => {
                const active = p.publicId === activeProjectId;
                return (
                  <li key={p.publicId}>
                    <Link
                      href={`/dashboard/projects/${p.publicId}`}
                      className={cn(
                        "flex items-center gap-2.5 rounded-xl px-2 py-2 transition",
                        active
                          ? "bg-white shadow-sm ring-1 ring-black/[0.04] dark:bg-stone-800 dark:ring-white/10"
                          : "hover:bg-white/70 dark:hover:bg-white/5"
                      )}
                    >
                      <span
                        className={cn(
                          "flex size-7 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br text-[11px] font-semibold text-white",
                          tones[i % tones.length]
                        )}
                      >
                        {p.name.slice(0, 1).toUpperCase()}
                      </span>
                      <div className="min-w-0">
                        <p className="truncate text-[13px] font-medium text-stone-800 dark:text-stone-100">
                          {p.name}
                        </p>
                        <p className="text-[11px] text-stone-400">
                          {p.documentCount} Dokumente
                        </p>
                      </div>
                    </Link>
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        <div className="mt-auto flex flex-col gap-3">
          <div className="rounded-xl bg-white/80 p-3 shadow-sm ring-1 ring-black/[0.04] dark:bg-stone-800/80 dark:ring-white/10">
            <div className="mb-1.5 flex items-center justify-between text-[11px]">
              <span className="font-medium text-stone-600 dark:text-stone-300">
                Plan
              </span>
              <span className="text-stone-400">Free</span>
            </div>
            <p className="text-[11px] leading-relaxed text-stone-400">
              {projects.length} Projekt{projects.length === 1 ? "" : "e"} ·
              Projekte, CLI und Versionsverlauf.
            </p>
            <div className="mt-2 flex items-center justify-between">
              <Link
                href="/dashboard/settings"
                className="text-[11px] font-medium text-stone-500 hover:text-stone-800"
              >
                Einstellungen
              </Link>
            </div>
          </div>

          <div className="flex items-center gap-2.5 rounded-xl px-1 py-1">
            <span className="flex size-8 items-center justify-center rounded-full bg-gradient-to-br from-stone-300 to-stone-500 text-[11px] font-semibold text-white ring-2 ring-white dark:ring-stone-800">
              {(user.name || user.email).slice(0, 1).toUpperCase()}
            </span>
            <div className="min-w-0 flex-1">
              <p className="truncate text-[12px] font-medium text-stone-800 dark:text-stone-100">
                {user.name || "Benutzer"}
              </p>
              <p className="truncate text-[11px] text-stone-400">{user.email}</p>
            </div>
            <form action={logoutAction}>
              <Button
                type="submit"
                variant="ghost"
                size="xs"
                className="text-[11px] text-stone-400"
              >
                Out
              </Button>
            </form>
          </div>
        </div>
      </div>
    </aside>
  );
}

export function SidebarNewProjectFallback() {
  return (
    <Link
      href="/dashboard"
      className="flex h-9 items-center justify-center gap-1.5 rounded-xl bg-white text-[13px] font-medium text-stone-800 shadow-sm ring-1 ring-black/[0.05] dark:bg-stone-800 dark:text-stone-100"
    >
      <Plus className="size-3.5" />
      Neues Projekt
    </Link>
  );
}
