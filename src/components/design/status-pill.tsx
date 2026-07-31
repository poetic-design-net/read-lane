import { cn } from "@/lib/utils";

type PillKind = "public" | "password" | "draft" | "archived" | "unlisted";

const styles: Record<PillKind, string> = {
  public:
    "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200/80 dark:bg-emerald-950/40 dark:text-emerald-300 dark:ring-emerald-800/60",
  password:
    "bg-sky-50 text-sky-700 ring-1 ring-sky-200/80 dark:bg-sky-950/40 dark:text-sky-300 dark:ring-sky-800/60",
  draft:
    "bg-stone-100 text-stone-600 ring-1 ring-stone-200/90 dark:bg-stone-800/60 dark:text-stone-300 dark:ring-stone-700",
  archived:
    "bg-amber-50 text-amber-800 ring-1 ring-amber-200/80 dark:bg-amber-950/40 dark:text-amber-200 dark:ring-amber-800/60",
  unlisted:
    "bg-violet-50 text-violet-700 ring-1 ring-violet-200/80 dark:bg-violet-950/40 dark:text-violet-300 dark:ring-violet-800/60",
};

const labels: Record<PillKind, string> = {
  public: "Public",
  password: "Password",
  draft: "Draft",
  archived: "Archiviert",
  unlisted: "Unlisted",
};

export function StatusPill({
  kind,
  className,
  children,
}: {
  kind: PillKind;
  className?: string;
  children?: React.ReactNode;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium tracking-tight",
        styles[kind],
        className
      )}
    >
      {children ?? labels[kind]}
    </span>
  );
}

export function statusFromDocument(input: {
  status: string;
  visibility: string;
  isPasswordProtected?: boolean;
}): PillKind {
  if (input.status === "draft") return "draft";
  if (input.status === "archived") return "archived";
  if (input.visibility === "password" || input.isPasswordProtected)
    return "password";
  if (input.visibility === "public") return "public";
  return "unlisted";
}
