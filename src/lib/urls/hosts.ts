import { appConfig } from "@/lib/config";

/** True when request host is the app subdomain (app.readlane.io). */
export function isAppHost(host: string | null | undefined): boolean {
  if (!host) return false;
  const h = host.split(":")[0]?.toLowerCase() ?? "";
  if (h.startsWith("app.")) return true;
  try {
    const appHost = new URL(appConfig.url).hostname.toLowerCase();
    return h === appHost && appHost.startsWith("app.");
  } catch {
    return false;
  }
}

/** True when host is the marketing apex (readlane.io), not app. */
export function isMarketingHost(host: string | null | undefined): boolean {
  if (!host) return false;
  const h = host.split(":")[0]?.toLowerCase() ?? "";
  if (h.startsWith("app.")) return false;
  try {
    const m = new URL(appConfig.marketingUrl).hostname.toLowerCase();
    if (h === m) return true;
  } catch {
    // ignore
  }
  // Local / single-host: treat non-app hosts as marketing for `/`
  return !h.startsWith("app.");
}

export function appPath(path: string): string {
  const base = appConfig.url.replace(/\/$/, "");
  const p = path.startsWith("/") ? path : `/${path}`;
  // Same origin in local dev: relative is fine and avoids CORS/cookie issues
  try {
    const app = new URL(appConfig.url);
    const marketing = new URL(appConfig.marketingUrl);
    if (app.host === marketing.host) return p;
  } catch {
    // ignore
  }
  return `${base}${p}`;
}

export function marketingPath(path: string): string {
  const base = appConfig.marketingUrl.replace(/\/$/, "");
  const p = path.startsWith("/") ? path : `/${path}`;
  try {
    const app = new URL(appConfig.url);
    const marketing = new URL(appConfig.marketingUrl);
    if (app.host === marketing.host) return p;
  } catch {
    // ignore
  }
  return `${base}${p}`;
}
