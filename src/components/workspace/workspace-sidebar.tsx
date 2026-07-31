import Link from "next/link";
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

export function WorkspaceSidebar({
  projects = [],
  user,
  activeProjectId,
  /** free = no projects UI */
  plan = "pro",
}: {
  projects?: ProjectSummary[];
  user?: { name: string | null; email: string } | null;
  activeProjectId?: string;
  plan?: "free" | "pro" | "business";
}) {
  const isFree = plan === "free";
  // Product chrome is only used when signed in; keep a safe fallback.
  if (!user) {
    return (
      <aside className="flex h-full w-[240px] shrink-0 flex-col border-r border-stone-200/80 bg-[#f6f5f3] dark:border-stone-800 dark:bg-stone-900/80 lg:w-[260px]">
        <div className="flex h-12 shrink-0 items-center border-b border-stone-200/70 px-4">
          <Link href="/" className="inline-flex items-center">
            <Logo variant="full" size="md" />
          </Link>
        </div>
        <div className="flex flex-1 flex-col justify-center gap-3 p-4">
          <p className="text-[13px] font-medium text-stone-800 dark:text-stone-100">
            Konto erforderlich
          </p>
          <p className="text-[12px] leading-relaxed text-stone-400">
            Zum Teilen von Markdown brauchen Sie ein Free-Konto. Gäste können
            nichts veröffentlichen.
          </p>
          <Button
            size="sm"
            className="h-9 w-full rounded-full"
            render={<Link href="/register" />}
          >
            Free-Konto erstellen
          </Button>
          <Button
            size="sm"
            variant="outline"
            className="h-9 w-full rounded-full"
            render={<Link href="/login" />}
          >
            Anmelden
          </Button>
        </div>
      </aside>
    );
  }

  return (
    <aside className="flex h-full w-[240px] shrink-0 flex-col border-r border-stone-200/80 bg-[#f6f5f3] dark:border-stone-800 dark:bg-stone-900/80 lg:w-[260px]">
      <div className="flex h-12 shrink-0 items-center gap-2.5 border-b border-stone-200/70 px-4 dark:border-stone-800">
        <Link href="/dashboard" className="inline-flex items-center">
          <Logo variant="full" size="md" />
        </Link>
      </div>

      <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto p-3.5">
        {isFree ? (
          <Button
            size="sm"
            className="h-10 w-full rounded-xl"
            render={<Link href="/create" />}
          >
            + Dokument
          </Button>
        ) : (
          <CreateProjectButton variant="sidebar" />
        )}

        <div className="min-h-0 flex-1">
          {isFree ? (
            <div className="rounded-xl px-2 py-2 text-[12px] leading-relaxed text-stone-400">
              <p className="font-medium text-stone-600 dark:text-stone-300">
                Dein kostenloser Link
              </p>
              <p className="mt-1">
                Ein aktives Dokument, unbegrenzte Updates. Projekte ab Pro.
              </p>
              <Link
                href="/dashboard/upgrade"
                className="mt-2 inline-block font-medium text-stone-600 underline-offset-2 hover:underline"
              >
                Upgrade zu Pro
              </Link>
            </div>
          ) : (
            <>
              <p className="mb-2 px-2 text-[10px] font-medium uppercase tracking-[0.14em] text-stone-400">
                Projekte
              </p>
              {projects.length === 0 ? (
                <p className="px-2 text-[13px] text-stone-400">
                  Noch keine Projekte. Legen Sie Ihr erstes an.
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
                            "flex items-center gap-2.5 rounded-xl px-2.5 py-2.5 transition",
                            active
                              ? "bg-white shadow-sm ring-1 ring-black/[0.04] dark:bg-stone-800 dark:ring-white/10"
                              : "hover:bg-white/70 dark:hover:bg-white/5"
                          )}
                        >
                          <span
                            className={cn(
                              "flex size-8 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br text-[12px] font-semibold text-white",
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
            </>
          )}
        </div>

        <div className="mt-auto flex shrink-0 flex-col gap-3">
          <div className="rounded-xl bg-white/90 p-3.5 shadow-sm ring-1 ring-black/[0.04] dark:bg-stone-800/90 dark:ring-white/10">
            <div className="mb-1.5 flex items-center justify-between text-[11px]">
              <span className="font-medium text-stone-600 dark:text-stone-300">
                Plan
              </span>
              <span className="text-stone-400">
                {isFree ? "Free" : plan === "business" ? "Business" : "Pro"}
              </span>
            </div>
            <p className="text-[11px] leading-relaxed text-stone-400">
              {isFree
                ? "1 dauerhafter Share-Link · unbegrenzte Updates."
                : `${projects.length} Projekt${projects.length === 1 ? "" : "e"} · CLI und Versionsverlauf.`}
            </p>
            <div className="mt-2.5 flex gap-3">
              <Link
                href="/create"
                className="text-[11px] font-medium text-stone-500 hover:text-stone-800"
              >
                {isFree ? "Ersetzen / neu" : "Neu teilen"}
              </Link>
              {isFree ? (
                <Link
                  href="/dashboard/upgrade"
                  className="text-[11px] font-medium text-stone-500 hover:text-stone-800"
                >
                  Upgrade
                </Link>
              ) : (
                <Link
                  href="/dashboard/settings"
                  className="text-[11px] font-medium text-stone-500 hover:text-stone-800"
                >
                  Einstellungen
                </Link>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2.5 px-1 py-1">
            <span className="flex size-9 items-center justify-center rounded-full bg-gradient-to-br from-stone-300 to-stone-500 text-[12px] font-semibold text-white ring-2 ring-white dark:ring-stone-800">
              {(user.name || user.email).slice(0, 1).toUpperCase()}
            </span>
            <div className="min-w-0 flex-1">
              <p className="truncate text-[13px] font-medium text-stone-800 dark:text-stone-100">
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
