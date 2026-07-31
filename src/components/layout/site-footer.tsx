import { MarketingFooter } from "./marketing-shell";

/** Backwards-compatible alias for secondary pages still importing SiteFooter. */
export function SiteFooter() {
  return <MarketingFooter />;
}
