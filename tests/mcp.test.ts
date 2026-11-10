import { describe, expect, it } from "vitest";
import { handleRpc, ToolError, type McpTool } from "@/lib/mcp/protocol";
import { projectUpdateSchema } from "@/lib/validation/document";

const tools: McpTool[] = [
  {
    name: "echo",
    description: "echo",
    inputSchema: { type: "object" },
    run: async (args) => `hi ${String(args.name)}`,
  },
  {
    name: "fails",
    description: "fails",
    inputSchema: { type: "object" },
    run: async () => {
      throw new ToolError("Projekt nicht gefunden");
    },
  },
  {
    name: "crashes",
    description: "crashes",
    inputSchema: { type: "object" },
    run: async () => {
      throw new Error("db password in stack");
    },
  },
];

describe("MCP protocol", () => {
  it("negotiates a supported version and falls back to the newest", async () => {
    const known = await handleRpc(
      { jsonrpc: "2.0", id: 1, method: "initialize", params: { protocolVersion: "2025-06-18" } },
      tools
    );
    expect((known?.result as { protocolVersion: string }).protocolVersion).toBe("2025-06-18");

    const unknown = await handleRpc(
      { jsonrpc: "2.0", id: 2, method: "initialize", params: { protocolVersion: "1999-01-01" } },
      tools
    );
    expect((unknown?.result as { protocolVersion: string }).protocolVersion).toBe("2025-11-25");
  });

  it("gives notifications no response", async () => {
    expect(await handleRpc({ jsonrpc: "2.0", method: "notifications/initialized" }, tools)).toBeNull();
  });

  it("lists tools without their implementation", async () => {
    const res = await handleRpc({ jsonrpc: "2.0", id: 3, method: "tools/list" }, tools);
    const listed = (res?.result as { tools: Record<string, unknown>[] }).tools;
    expect(listed.map((t) => t.name)).toEqual(["echo", "fails", "crashes"]);
    expect(listed[0]).not.toHaveProperty("run");
  });

  it("returns tool output, tool errors as results, and hides unexpected errors", async () => {
    const call = (name: string) =>
      handleRpc({ jsonrpc: "2.0", id: 4, method: "tools/call", params: { name, arguments: { name: "Ada" } } }, tools);

    expect((await call("echo"))?.result).toEqual({ content: [{ type: "text", text: "hi Ada" }] });
    expect((await call("fails"))?.result).toEqual({
      content: [{ type: "text", text: "Projekt nicht gefunden" }],
      isError: true,
    });
    const crash = JSON.stringify(await call("crashes"));
    expect(crash).not.toContain("password");
    expect((await call("missing"))?.error?.code).toBe(-32602);
  });

  it("rejects unknown methods", async () => {
    const res = await handleRpc({ jsonrpc: "2.0", id: 5, method: "resources/list" }, tools);
    expect(res?.error?.code).toBe(-32601);
  });
});

describe("project recipients", () => {
  it("normalizes addresses and rejects invalid ones", () => {
    expect(projectUpdateSchema.parse({ recipients: [" Kunde@Example.com "] }).recipients).toEqual([
      "kunde@example.com",
    ]);
    expect(projectUpdateSchema.safeParse({ recipients: ["kein-mail"] }).success).toBe(false);
  });
});
