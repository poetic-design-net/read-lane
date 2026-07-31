import Link from "next/link";
import { cn } from "@/lib/utils";
import { Logo } from "@/components/brand/logo";
import { appConfig } from "@/lib/config";


/**
 * Full-viewport product chrome — edge to edge, no floating box.
 * Sidebar + title bar + main area fill the entire screen.
 */
export function ProductShell({
  sidebar,
  children,
  userInitial,
  centerTitle = appConfig.name,
  showAccountAvatar = true,
  className,
}: {
  sidebar: React.ReactNode;
  children: React.ReactNode;
  userInitial?: string;
  centerTitle?: string;
  /** Hide faux avatar when not signed in (no guest persona). */
  showAccountAvatar?: boolean;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex h-[100dvh] w-full overflow-hidden bg-white text-stone-900 dark:bg-stone-950 dark:text-stone-100",
        className
      )}
    >
      <div className="hidden h-full shrink-0 md:flex">{sidebar}</div>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="relative flex h-12 shrink-0 items-center justify-between border-b border-stone-200/80 bg-white px-4 dark:border-stone-800 dark:bg-stone-950 sm:px-5">
          <div className="flex items-center gap-3">
            <Link
              href={showAccountAvatar ? "/dashboard" : "/login"}
              className="inline-flex items-center md:hidden"
            >
              <Logo variant="mark" size="sm" />
            </Link>
            <p className="hidden text-[13px] font-medium text-stone-600 sm:block dark:text-stone-300">
              {centerTitle}
            </p>
          </div>

          <div className="flex items-center gap-2 text-stone-400">
            {showAccountAvatar ? (
              <span
                className="flex size-7 items-center justify-center rounded-full bg-gradient-to-br from-stone-300 to-stone-500 text-[11px] font-semibold text-white"
                title="Konto"
              >
                {(userInitial || "R").slice(0, 1).toUpperCase()}
              </span>
            ) : (
              <Link
                href="/login"
                className="rounded-full px-3 py-1 text-[12px] font-medium text-stone-500 ring-1 ring-stone-200 transition hover:bg-stone-50 hover:text-stone-800 dark:ring-stone-700"
              >
                Anmelden
              </Link>
            )}
          </div>
        </header>

        <main className="min-h-0 flex-1 overflow-hidden bg-white dark:bg-stone-950">
          {children}
        </main>
      </div>
    </div>
  );
}
