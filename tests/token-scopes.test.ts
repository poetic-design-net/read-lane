import { describe, expect, it } from "vitest";
import {
  assertScopeAllowsMethod,
  assertScopeAllowsProject,
} from "@/lib/cli/tokens";

describe("token scopes", () => {
  it("blocks writes for read-only tokens", () => {
    expect(() => assertScopeAllowsMethod("project_read", "GET")).not.toThrow();
    expect(() => assertScopeAllowsMethod("project_read", "POST")).toThrow();
    expect(() => assertScopeAllowsMethod("project_read", "delete")).toThrow();
    expect(() => assertScopeAllowsMethod("project_write", "POST")).not.toThrow();
    expect(() => assertScopeAllowsMethod("full", "DELETE")).not.toThrow();
  });

  it("keeps project tokens inside their project", () => {
    const scoped = () =>
      assertScopeAllowsProject("project_write", "proj-1", "proj-2");
    expect(scoped).toThrow();
    expect(() =>
      assertScopeAllowsProject("project_write", "proj-1", "proj-1")
    ).not.toThrow();
    // Documents outside any project are off limits for a scoped token.
    expect(() =>
      assertScopeAllowsProject("project_write", "proj-1", null)
    ).toThrow();
    // Full tokens and session auth are unrestricted.
    expect(() =>
      assertScopeAllowsProject("full", null, "proj-2")
    ).not.toThrow();
    expect(() =>
      assertScopeAllowsProject(undefined, undefined, "proj-2")
    ).not.toThrow();
  });
});
