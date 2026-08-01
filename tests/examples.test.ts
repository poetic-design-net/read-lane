import { describe, expect, it } from "vitest";
import { readFileSync } from "fs";
import { join } from "path";
import { EXAMPLE_DOCUMENTS } from "@/lib/examples/catalog";
import { detectRenderer, isTextBasedRenderer } from "@/lib/documents/formats";
import { detectMagicBytes } from "@/lib/files/service";
import { convertDocxToHtml, isZipContainer } from "@/lib/documents/docx";

const publicDir = join(__dirname, "..", "public");

describe("example documents", () => {
  it("covers every renderer the app supports", () => {
    const covered = new Set(EXAMPLE_DOCUMENTS.map((e) => e.rendererType));
    for (const renderer of [
      "markdown",
      "text",
      "code",
      "csv",
      "html",
      "pdf",
      "image",
      "docx",
    ]) {
      expect(covered.has(renderer as never)).toBe(true);
    }
  });

  it("carries content for text formats and a file for the rest", () => {
    for (const example of EXAMPLE_DOCUMENTS) {
      if (isTextBasedRenderer(example.rendererType)) {
        expect(example.content?.trim().length ?? 0).toBeGreaterThan(0);
      } else {
        expect(example.url).toBeTruthy();
      }
    }
  });

  // The upload pipeline rejects on filename and magic bytes, so the shipped
  // sample files have to survive exactly those checks.
  it("ships binary samples the upload pipeline accepts", async () => {
    for (const example of EXAMPLE_DOCUMENTS.filter((e) => e.url)) {
      const data = readFileSync(join(publicDir, example.url!));
      expect(detectRenderer(example.filename, null)).toBe(example.rendererType);

      if (example.rendererType === "docx") {
        expect(isZipContainer(data)).toBe(true);
        expect(await convertDocxToHtml(data)).toContain("<table>");
      } else {
        expect(detectMagicBytes(data)).toBe(example.rendererType);
      }
    }
  });
});
