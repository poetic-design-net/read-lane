import { NextResponse, type NextRequest } from "next/server";

/**
 * Host routing:
 * - app.readlane.io     → product (`/` → /dashboard)
 * - readlane.io         → marketing; product paths redirect to app.* only if host differs
 * - *.vercel.app / local → single-host: no cross-host redirects (avoids loops)
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

function hostnameOnly(host: string): string {
  return host.split(":")[0]?.toLowerCase() ?? "";
}

export function middleware(request: NextRequest) {
  const host = hostnameOnly(request.headers.get("host") ?? "");
  const { pathname } = request.nextUrl;
  const isAppSubdomain = host.startsWith("app.");
  const isLocal = host === "localhost" || host === "127.0.0.1";
  const isVercelPreview =
    host.endsWith(".vercel.app") || host.endsWith(".now.sh");

  // App subdomain: root → dashboard
  if (isAppSubdomain && pathname === "/") {
    const url = request.nextUrl.clone();
    url.pathname = "/dashboard";
    return withSecurityHeaders(NextResponse.rewrite(url));
  }

  // Cross-host redirect only when marketing and app are truly different hosts.
  // Skip on localhost, Vercel preview/production single-host, or same hostname.
  if (!isAppSubdomain && !isLocal && !isVercelPreview) {
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
          const targetHost = hostnameOnly(target.host);
          // Prevent infinite redirect when APP_URL points at this same host
          if (targetHost && targetHost !== host) {
            return withSecurityHeaders(NextResponse.redirect(target));
          }
        } catch {
          // fall through
        }
      }
    }
  }

  // Canonical share path: /s/:id → /d/:id
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
