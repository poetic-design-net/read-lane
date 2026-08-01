import { describe, expect, it } from "vitest";
import { canAccessDocument, roleSatisfies } from "@/lib/projects/members";

describe("project roles", () => {
  it("ranks roles", () => {
    expect(roleSatisfies("owner", "editor")).toBe(true);
    expect(roleSatisfies("editor", "editor")).toBe(true);
    expect(roleSatisfies("viewer", "editor")).toBe(false);
    expect(roleSatisfies("viewer", "viewer")).toBe(true);
  });

  // Both paths resolve without a project lookup, so no database is involved.
  it("lets the creator through and stops strangers on projectless documents", async () => {
    const doc = { createdBy: "user-1", projectId: null };
    await expect(canAccessDocument(doc, "user-1")).resolves.toBe(true);
    await expect(canAccessDocument(doc, "user-2")).resolves.toBe(false);
  });
});
