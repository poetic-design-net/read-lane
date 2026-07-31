import { describe, expect, it } from "vitest";
import {
  assertNotBlockedSecret,
  detectMagicBytes,
  isLikelyText,
  sanitizeFilename,
  FileError,
} from "@/lib/files/service";

describe("file security", () => {
  it("blocks secret filenames", () => {
    expect(() => assertNotBlockedSecret(".env")).toThrow(FileError);
    expect(() => assertNotBlockedSecret("id_rsa")).toThrow(FileError);
    expect(() => assertNotBlockedSecret("service-account.json")).toThrow(
      FileError
    );
    expect(() => assertNotBlockedSecret("README.md")).not.toThrow();
  });

  it("sanitizes filenames", () => {
    expect(sanitizeFilename("../../etc/passwd")).toBe("passwd");
    expect(sanitizeFilename("My Doc (1).md")).toContain("Doc");
  });

  it("detects PDF magic bytes", () => {
    const pdf = Buffer.from("%PDF-1.4 rest");
    expect(detectMagicBytes(pdf)).toBe("pdf");
  });

  it("detects PNG magic bytes", () => {
    const png = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
    expect(detectMagicBytes(png)).toBe("image");
  });

  it("rejects binary as text", () => {
    const bin = Buffer.from([0, 1, 2, 3, 4, 5, 0, 0, 0]);
    expect(isLikelyText(bin)).toBe(false);
    expect(isLikelyText(Buffer.from("# Hello\n\nWorld"))).toBe(true);
  });
});
