import { describe, expect, it } from "vitest";
import { previewExcerpt } from "@/lib/documents/mappers";

describe("previewExcerpt", () => {
  it("leaves short documents untouched", () => {
    const short = "# Titel\n\nZwei Zeilen.";
    expect(previewExcerpt(short)).toBe(short);
  });

  it("cuts long documents at a line break", () => {
    const long = Array.from({ length: 500 }, (_, i) => `Zeile ${i}`).join("\n");
    const out = previewExcerpt(long, 200);
    expect(out.length).toBeLessThan(220);
    expect(out.endsWith("…")).toBe(true);
    // The cut lands on a boundary, so no half line survives.
    expect(out.split("\n").at(-3)).toMatch(/^Zeile \d+$/);
  });

  it("falls back to a hard cut when there is no usable break", () => {
    const out = previewExcerpt("x".repeat(400), 100);
    expect(out.startsWith("x".repeat(100))).toBe(true);
    expect(out.endsWith("…")).toBe(true);
  });
});
