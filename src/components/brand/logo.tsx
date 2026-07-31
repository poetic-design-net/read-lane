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

/**
 * Official brand mark from CI — AVIF primary, PNG fallback, 2× for retina.
 * Full symbol as designed (no cutout / no simplified SVG).
 */
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
    <picture>
      <source
        type="image/avif"
        srcSet="/brand/logo-symbol-64.avif 1x, /brand/logo-symbol-128.avif 2x"
      />
      <source
        type="image/png"
        srcSet="/brand/logo-symbol-64.png 1x, /brand/logo-symbol-128.png 2x"
      />
      <img
        src="/brand/logo-symbol-64.png"
        alt={title}
        width={px}
        height={px}
        className={cn(
          "shrink-0 object-contain select-none",
          markSizes[size],
          className
        )}
        draggable={false}
        decoding="async"
      />
    </picture>
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
