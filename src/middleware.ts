import { NextResponse, type NextRequest } from "next/server";

/**
 * Host routing:
 * - app.readlane.io  → product (`/` → /dashboard; auth pages redirect there)
 * - readlane.io      → marketing landing at `/`
 * - localhost        → path-based (landing `/`, app under /dashboard|/create|…)
 *
 * Sharing documents always requires an account (enforced in pages + actions).
 */
function withSecurityHeaders(response: NextResponse) {
  response.headers.set("X-Content-Type-Options", "nosniff");
  response.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
  response.headers.set(
    "Permissions-Policy",
    "camera=(), microphone=(), geolocation=()"
  );
  response.headers.set("X-Frame-Options", "SAMEORIGIN");
  if (process.env.NODE_ENV === "production") {
    response.headers.set(
      "Strict-Transport-Security",
      "max-age=63072000; includeSubDomains; preload"
    );
  }
  // Baseline CSP — document content is sanitized server-side; disallow scripts from uploads
  response.headers.set(
    "Content-Security-Policy",
    [
      "default-src 'self'",
      "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
      "style-src 'self' 'unsafe-inline'",
      "img-src 'self' data: blob: https:",
      "font-src 'self' data:",
      "connect-src 'self' https:",
      "frame-ancestors 'self'",
      "base-uri 'self'",
      "form-action 'self'",
    ].join("; ")
  );
  return response;
}

export function middleware(request: NextRequest) {
  const host = request.headers.get("host")?.split(":")[0]?.toLowerCase() ?? "";
  const { pathname } = request.nextUrl;
  const isApp = host.startsWith("app.");

  // App subdomain: root opens the dashboard (login if needed)
  if (isApp && pathname === "/") {
    const url = request.nextUrl.clone();
    url.pathname = "/dashboard";
    return withSecurityHeaders(NextResponse.rewrite(url));
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
          return withSecurityHeaders(NextResponse.redirect(target));
        } catch {
          // fall through
        }
      }
    }
  }

  // Canonical share path rewrite: /s/:id serves same as /d/:id without extra hop when possible
  if (pathname.startsWith("/s/") && pathname.split("/").length === 3) {
    const shareId = pathname.slice(3);
    if (shareId && !shareId.includes("/")) {
      const url = request.nextUrl.clone();
      url.pathname = `/d/${shareId}`;
      return withSecurityHeaders(NextResponse.rewrite(url));
    }
  }

  return withSecurityHeaders(NextResponse.next());
}


export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|brand/|marketing/|.*\\.(?:svg|png|jpg|jpeg|gif|webp|avif|ico)$).*)",
  ],
};
