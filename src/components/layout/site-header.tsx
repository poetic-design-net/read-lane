import { MarketingHeader } from "./marketing-shell";

/** Backwards-compatible alias for secondary pages still importing SiteHeader. */
export async function SiteHeader() {
  return <MarketingHeader />;
}
