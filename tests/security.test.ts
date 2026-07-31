import { describe, it, expect, beforeEach } from "vitest";
import {
  createPublicId,
  createManagementToken,
  hashSecret,
  verifySecret,
  sha256,
} from "@/lib/security/tokens";
import { hashPassword, verifyPassword } from "@/lib/security/passwords";
import {
  checkRateLimit,
  resetRateLimits,
} from "@/lib/security/rate-limit";
import {
  publishDocumentSchema,
  unlockDocumentSchema,
  authRegisterSchema,
} from "@/lib/validation/document";
import { contentChecksum } from "@/lib/utils/checksum";
import { isExpired, resolveExpiresAt } from "@/lib/utils/expiry";
import { parseFrontmatter } from "@/lib/markdown/frontmatter";
import { containsDangerousPatterns } from "@/lib/markdown/render";
import { markdownSanitizeSchema } from "@/lib/markdown/sanitize-schema";

describe("tokens", () => {
  it("creates non-guessable public ids", () => {
    const a = createPublicId();
    const b = createPublicId();
    expect(a).not.toEqual(b);
    expect(a.length).toBeGreaterThanOrEqual(10);
  });

  it("creates long management tokens", () => {
    const t = createManagementToken();
    expect(t.length).toBeGreaterThanOrEqual(24);
  });

  it("hashes and verifies secrets with bcrypt", async () => {
    const plain = "super-secret-token-value";
    const hash = await hashSecret(plain);
    expect(hash).not.toContain(plain);
    expect(await verifySecret(plain, hash)).toBe(true);
    expect(await verifySecret("wrong", hash)).toBe(false);
  });

  it("sha256 is stable for management token lookup", () => {
    const token = "abc123token";
    expect(sha256(token)).toEqual(sha256(token));
    expect(sha256(token)).not.toEqual(sha256("other"));
  });
});

describe("passwords", () => {
  it("hashes and verifies document passwords", async () => {
    const hash = await hashPassword("s3cret!");
    expect(hash.startsWith("$2")).toBe(true);
    expect(await verifyPassword("s3cret!", hash)).toBe(true);
    expect(await verifyPassword("wrong", hash)).toBe(false);
    expect(await verifyPassword("s3cret!", null)).toBe(false);
  });
});

describe("rate limit", () => {
  beforeEach(() => resetRateLimits());

  it("blocks after max attempts", () => {
    const key = "test:ip";
    for (let i = 0; i < 3; i++) {
      expect(checkRateLimit(key, 60_000, 3).success).toBe(true);
    }
    expect(checkRateLimit(key, 60_000, 3).success).toBe(false);
  });
});

describe("zod validation", () => {
  it("requires password for password visibility", () => {
    const r = publishDocumentSchema.safeParse({
      title: "T",
      markdownContent: "# Hi",
      visibility: "password",
    });
    expect(r.success).toBe(false);
  });

  it("accepts valid publish payload", () => {
    const r = publishDocumentSchema.safeParse({
      title: "Doc",
      markdownContent: "# Hello",
      visibility: "unlisted",
      theme: "dark",
      contentWidth: "narrow",
    });
    expect(r.success).toBe(true);
  });

  it("rejects empty markdown", () => {
    const r = publishDocumentSchema.safeParse({
      title: "Doc",
      markdownContent: "",
    });
    expect(r.success).toBe(false);
  });

  it("validates unlock payload", () => {
    expect(
      unlockDocumentSchema.safeParse({ publicId: "x", password: "y" }).success
    ).toBe(true);
    expect(unlockDocumentSchema.safeParse({ publicId: "" }).success).toBe(
      false
    );
  });

  it("validates registration", () => {
    expect(
      authRegisterSchema.safeParse({
        email: "a@b.co",
        password: "longenough",
      }).success
    ).toBe(true);
    expect(
      authRegisterSchema.safeParse({
        email: "bad",
        password: "short",
      }).success
    ).toBe(false);
  });
});

describe("expiry", () => {
  it("never expires when null", () => {
    expect(isExpired(null)).toBe(false);
  });

  it("detects past dates", () => {
    expect(isExpired(new Date(Date.now() - 1000))).toBe(true);
  });

  it("resolves presets", () => {
    expect(resolveExpiresAt("never")).toBeNull();
    expect(resolveExpiresAt("24h")!.getTime()).toBeGreaterThan(Date.now());
  });
});

describe("checksum", () => {
  it("is deterministic", () => {
    expect(contentChecksum("abc")).toEqual(contentChecksum("abc"));
    expect(contentChecksum("abc")).not.toEqual(contentChecksum("abd"));
  });
});

describe("frontmatter", () => {
  it("parses yaml-like frontmatter", () => {
    const raw = `---
title: Hello
visibility: unlisted
toc: true
---
# Body
`;
    const parsed = parseFrontmatter(raw);
    expect(parsed.frontmatter.title).toBe("Hello");
    expect(parsed.frontmatter.visibility).toBe("unlisted");
    expect(parsed.frontmatter.toc).toBe(true);
    expect(parsed.content).toContain("# Body");
  });
});

describe("markdown security", () => {
  it("detects dangerous patterns", () => {
    expect(containsDangerousPatterns('<script>alert(1)</script>')).toBe(true);
    expect(containsDangerousPatterns("[x](javascript:alert(1))")).toBe(true);
    expect(containsDangerousPatterns("# Safe heading")).toBe(false);
  });

  it("sanitize schema blocks javascript protocol", () => {
    expect(markdownSanitizeSchema.protocols?.href).not.toContain("javascript");
    expect(markdownSanitizeSchema.protocols?.href).toContain("https");
  });
});
