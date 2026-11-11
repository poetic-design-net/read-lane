/**
 * Minimal MCP server over Streamable HTTP: stateless, JSON responses only.
 *
 * ponytail: hand-rolled JSON-RPC instead of @modelcontextprotocol/sdk — the
 * server only answers initialize, ping, tools/list and tools/call. Pull in the
 * SDK when it needs sessions, streaming (SSE) or server-initiated requests.
 */

export type JsonRpcId = string | number | null;

export type JsonRpcMessage = {
  jsonrpc?: string;
  id?: JsonRpcId;
  method?: string;
  params?: Record<string, unknown>;
};

export type JsonRpcResponse = {
  jsonrpc: "2.0";
  id: JsonRpcId;
  result?: unknown;
  error?: { code: number; message: string };
};

export type McpTool = {
  name: string;
  description: string;
  inputSchema: Record<string, unknown>;
  run: (args: Record<string, unknown>) => Promise<string>;
};

/** Raised by a tool for errors the agent should read and act on. */
export class ToolError extends Error {}

const SUPPORTED_VERSIONS = ["2025-11-25", "2025-06-18", "2025-03-26"];

export const SERVER_INSTRUCTIONS =
  "Poetic Design Notes (Readlane) veröffentlicht Markdown als gestaltete Seite unter der Domain und dem Branding des Projekts. " +
  "Ein Projekt steht für einen Kunden. Ablauf für ein Kunden-Update: list_projects, dann publish_document mit " +
  "dem Projekt; das Ergebnis enthält den Link und die hinterlegten Empfänger. Die Mail mit dem Link nie selbst " +
  "senden, sondern als Entwurf anlegen, damit der Nutzer sie prüft.";

/** Returns null for notifications, which get no response body. */
export async function handleRpc(
  msg: JsonRpcMessage,
  tools: McpTool[]
): Promise<JsonRpcResponse | null> {
  if (msg.id === undefined) return null;
  const id = msg.id;
  const ok = (result: unknown): JsonRpcResponse => ({ jsonrpc: "2.0", id, result });
  const fail = (code: number, message: string): JsonRpcResponse => ({
    jsonrpc: "2.0",
    id,
    error: { code, message },
  });

  switch (msg.method) {
    case "initialize": {
      const requested = msg.params?.protocolVersion;
      return ok({
        protocolVersion:
          typeof requested === "string" && SUPPORTED_VERSIONS.includes(requested)
            ? requested
            : SUPPORTED_VERSIONS[0],
        capabilities: { tools: {} },
        serverInfo: { name: "readlane", version: "1.0.0" },
        instructions: SERVER_INSTRUCTIONS,
      });
    }
    case "ping":
      return ok({});
    case "tools/list":
      return ok({
        tools: tools.map(({ name, description, inputSchema }) => ({
          name,
          description,
          inputSchema,
        })),
      });
    case "tools/call": {
      const tool = tools.find((t) => t.name === msg.params?.name);
      if (!tool) return fail(-32602, `Unbekanntes Werkzeug: ${String(msg.params?.name)}`);
      const args = (msg.params?.arguments ?? {}) as Record<string, unknown>;
      try {
        const text = await tool.run(args);
        return ok({ content: [{ type: "text", text }] });
      } catch (e) {
        // Tool failures go back as results so the agent can read and fix them.
        const message =
          e instanceof ToolError ? e.message : "Interner Fehler beim Ausführen des Werkzeugs.";
        return ok({ content: [{ type: "text", text: message }], isError: true });
      }
    }
    default:
      return fail(-32601, `Methode nicht unterstützt: ${String(msg.method)}`);
  }
}
