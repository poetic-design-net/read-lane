import { NextRequest } from "next/server";
import { authenticateBearer, CliAuthError } from "@/lib/cli/tokens";
import { handleRpc, type JsonRpcMessage } from "@/lib/mcp/protocol";
import { readlaneTools } from "@/lib/mcp/tools";
import { checkRateLimit } from "@/lib/security/rate-limit";
import { appConfig } from "@/lib/config";

/**
 * MCP endpoint (Streamable HTTP, stateless). Auth: an API token from
 * Dashboard → Einstellungen as `Authorization: Bearer …`.
 */
export async function POST(req: NextRequest) {
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0] ?? "unknown";
  const rl = checkRateLimit(
    `mcp:${ip}`,
    appConfig.rateLimit.api.windowMs,
    appConfig.rateLimit.api.max
  );
  if (!rl.success) return rpcError(429, -32000, "Zu viele Anfragen");

  let auth;
  try {
    // Every MCP call is a POST; per-tool write checks happen in the tools.
    auth = await authenticateBearer({ headers: req.headers, method: "GET" });
  } catch (e) {
    const message = e instanceof CliAuthError ? e.message : "Nicht angemeldet";
    return rpcError(401, -32001, message, {
      "WWW-Authenticate": 'Bearer realm="readlane"',
    });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return rpcError(400, -32700, "Ungültiges JSON");
  }

  const tools = readlaneTools(auth);
  const messages = (Array.isArray(body) ? body : [body]) as JsonRpcMessage[];
  const responses = (
    await Promise.all(messages.map((m) => handleRpc(m, tools)))
  ).filter((r) => r !== null);

  if (responses.length === 0) return new Response(null, { status: 202 });
  return Response.json(Array.isArray(body) ? responses : responses[0]);
}

/** No server-initiated stream: clients fall back to plain POST. */
export function GET() {
  return new Response(null, { status: 405, headers: { Allow: "POST" } });
}

function rpcError(
  status: number,
  code: number,
  message: string,
  headers: Record<string, string> = {}
) {
  return Response.json(
    { jsonrpc: "2.0", id: null, error: { code, message } },
    { status, headers }
  );
}
