import { NextResponse, type NextRequest } from "next/server";

/**
 * Host routing:
 * - app.readlane.io  → product (`/` → /dashboard; auth pages redirect there)
 * - readlane.io      → marketing landing at `/`
 * - localhost        → path-based (landing `/`, app under /dashboard|/create|…)
 *
 * Sharing documents always requires an account (enforced in pages + actions).
 */
export function middleware(request: NextRequest) {
  const host = request.headers.get("host")?.split(":")[0]?.toLowerCase() ?? "";
  const { pathname } = request.nextUrl;
  const isApp = host.startsWith("app.");

  // App subdomain: root opens the dashboard (login if needed)
  if (isApp && pathname === "/") {
    const url = request.nextUrl.clone();
    url.pathname = "/dashboard";
    return NextResponse.rewrite(url);
  }

  // Marketing apex: send product routes to the app host when configured
  if (!isApp && host !== "localhost" && host !== "127.0.0.1") {
    const appOnly = [
      "/create",
      "/dashboard",
      "/login",
      "/register",
      "/manage",
      "/cli",
      "/forgot-password",
      "/reset-password",
      "/auth",
    ];
    if (appOnly.some((p) => pathname === p || pathname.startsWith(`${p}/`))) {
      const appUrl = process.env.NEXT_PUBLIC_APP_URL;
      if (appUrl) {
        try {
          const target = new URL(pathname + request.nextUrl.search, appUrl);
          return NextResponse.redirect(target);
        } catch {
          // fall through
        }
      }
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|brand/|marketing/|.*\\.(?:svg|png|jpg|jpeg|gif|webp|avif|ico)$).*)",
  ],
};
