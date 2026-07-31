import { cn } from "@/lib/utils";
import { appConfig } from "@/lib/config";


export function PremiumCard({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "w-full rounded-[22px] border border-white/80 bg-white/90 p-6 shadow-[0_1px_1px_rgba(15,15,15,0.03),0_20px_50px_-18px_rgba(15,15,15,0.14)] ring-1 ring-black/[0.03] backdrop-blur-sm dark:border-white/10 dark:bg-stone-900/90 dark:ring-white/5 sm:p-8",
        className
      )}
    >
      {children}
    </div>
  );
}

export function MarketingBackdrop({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "relative flex min-h-[100dvh] flex-col overflow-x-hidden bg-[#f3f1ec] text-stone-900 dark:bg-stone-950 dark:text-stone-100",
        className
      )}
    >
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 h-[55vh] bg-[radial-gradient(ellipse_at_50%_0%,rgba(255,255,255,0.85),transparent_62%)] dark:bg-[radial-gradient(ellipse_at_50%_0%,rgba(255,255,255,0.04),transparent_55%)]"
      />
      {children}
    </div>
  );
}

export function MarketingFooter({
  appName,
}: {
  appName?: string;
} = {}) {
  const name = appName ?? appConfig.name;

  return (
    <footer className="relative z-10 mt-auto border-t border-stone-200/60 py-8 dark:border-stone-800">
      <div className="mx-auto flex max-w-5xl flex-col gap-3 px-5 text-[13px] text-stone-400 sm:flex-row sm:items-center sm:justify-between sm:px-8">
        <p>
          © {new Date().getFullYear()} {name}
        </p>
        <nav className="flex gap-4">
          <a
            href="/privacy"
            className="hover:text-stone-700 dark:hover:text-stone-200"
          >
            Datenschutz
          </a>
          <a
            href="/imprint"
            className="hover:text-stone-700 dark:hover:text-stone-200"
          >
            Impressum
          </a>
        </nav>
      </div>
    </footer>
  );
}
