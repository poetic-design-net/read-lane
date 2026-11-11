import { cn } from "@/lib/utils";
import { appConfig } from "@/lib/config";

type LogoVariant = "full" | "mark" | "wordmark";
type LogoSize = "sm" | "md" | "lg";

/** Display size in CSS pixels */
const markSizes: Record<LogoSize, string> = {
  sm: "size-7",
  md: "size-8",
  lg: "size-10",
};

const markPx: Record<LogoSize, number> = {
  sm: 28,
  md: 32,
  lg: 40,
};

const wordSizes: Record<LogoSize, string> = {
  sm: "text-[13px]",
  md: "text-[14px]",
  lg: "text-[15px]",
};

/** The Poetic Design feather. Dark artwork on transparency, inverted in dark mode. */
export function LogoMark({
  className,
  size = "md",
  title = appConfig.name,
}: {
  className?: string;
  size?: LogoSize;
  title?: string;
}) {
  const px = markPx[size];

  return (
    // eslint-disable-next-line @next/next/no-img-element -- tiny static mark
    <img
      src="/brand/poetic-feather.png"
      alt={title}
      width={px}
      height={px}
      className={cn(
        "shrink-0 object-contain select-none dark:invert",
        markSizes[size],
        className
      )}
      draggable={false}
      decoding="async"
    />
  );
}

/**
 * Brand logo with mark + optional wordmark / tagline.
 * - `mark` — compact chrome (sidebar, doc header)
 * - `full` — mark + name
 * - `wordmark` — text only
 */
export function Logo({
  variant = "full",
  size = "md",
  showTagline = false,
  className,
  markClassName,
}: {
  variant?: LogoVariant;
  size?: LogoSize;
  showTagline?: boolean;
  /** @deprecated kept for API compatibility */
  mono?: boolean;
  className?: string;
  markClassName?: string;
}) {
  const name = appConfig.name;
  const tagline = appConfig.tagline;

  if (variant === "mark") {
    return (
      <LogoMark
        size={size}
        className={cn(markClassName, className)}
        title={name}
      />
    );
  }

  if (variant === "wordmark") {
    return (
      <span
        className={cn(
          "font-semibold tracking-tight text-[#2B313B] dark:text-stone-50",
          wordSizes[size],
          className
        )}
      >
        {name}
      </span>
    );
  }

  return (
    <span className={cn("inline-flex items-center gap-2.5", className)}>
      <LogoMark size={size} className={markClassName} title={name} />
      <span className="min-w-0">
        <span
          className={cn(
            "block font-semibold tracking-tight text-[#2B313B] dark:text-stone-50",
            wordSizes[size]
          )}
        >
          {name}
        </span>
        {showTagline ? (
          <span className="mt-0.5 hidden text-[11px] leading-none text-[#6B7C93] sm:block">
            {tagline}
          </span>
        ) : null}
      </span>
    </span>
  );
}
