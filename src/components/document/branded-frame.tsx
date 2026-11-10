import type { CSSProperties, ReactNode } from "react";
import { Newsreader, Space_Grotesk } from "next/font/google";
import { DocumentToolbar } from "@/components/document/document-toolbar";
import { cn } from "@/lib/utils";

const display = Space_Grotesk({
  variable: "--font-brand-display",
  subsets: ["latin"],
});

const body = Newsreader({
  variable: "--font-brand-body",
  subsets: ["latin"],
  style: ["normal", "italic"],
});

export type Brand = {
  name: string;
  logoUrl: string | null;
  color: string | null;
  websiteUrl: string | null;
  contact: string | null;
};

/**
 * Page frame for documents served on a verified custom domain: the agency's
 * name, logo and footer instead of Readlane's. Styles live under `.brand-page`
 * in globals.css.
 */
export function BrandedFrame({
  brand,
  shareUrl,
  children,
}: {
  brand: Brand;
  shareUrl: string;
  children: ReactNode;
}) {
  const style = brand.color
    ? ({ "--brand-accent": brand.color, "--brand-accent-dark": brand.color } as CSSProperties)
    : undefined;
  const home = brand.websiteUrl ?? "/";

  return (
    <div
      className={cn("brand-page flex min-h-0 flex-1 flex-col", display.variable, body.variable)}
      style={style}
    >
      <header className="brand-header flex h-16 shrink-0 items-center justify-between px-5 sm:px-10">
        <a href={home} className="flex items-center gap-3">
          {brand.logoUrl && (
            // eslint-disable-next-line @next/next/no-img-element -- customer-hosted logo, no loader
            <img src={brand.logoUrl} alt="" className="brand-logo h-8 w-auto" />
          )}
          <span className="brand-label text-[13px]">{brand.name}</span>
        </a>
        <DocumentToolbar shareUrl={shareUrl} />
      </header>

      <div className="flex min-h-0 flex-1 flex-col overflow-y-auto">
        <main className="flex-1 px-5 pb-24 pt-12 sm:px-10 sm:pt-20">{children}</main>

        <footer className="brand-footer px-5 py-12 sm:px-10">
          <div className="mx-auto flex max-w-[44rem] flex-col gap-2 sm:flex-row sm:items-baseline sm:justify-between">
            <span className="brand-label text-[12px]">{brand.name}</span>
            <span className="text-[15px]">
              {brand.contact}
              {brand.contact && brand.websiteUrl && " · "}
              {brand.websiteUrl && (
                <a href={brand.websiteUrl} className="brand-link">
                  {brand.websiteUrl.replace(/^https:\/\//, "").replace(/\/$/, "")}
                </a>
              )}
            </span>
          </div>
        </footer>
      </div>
    </div>
  );
}

/** Small uppercase line above the title, with the logo's "pixel" square. */
export function BrandedEyebrow({ children }: { children: ReactNode }) {
  return (
    <p className="brand-label mb-6 flex flex-wrap items-center gap-x-3 gap-y-1 text-[12px]">
      <span aria-hidden className="brand-pixel shrink-0" />
      {children}
    </p>
  );
}
