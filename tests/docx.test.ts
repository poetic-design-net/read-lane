import { describe, expect, it } from "vitest";
import { readFileSync } from "fs";
import { join } from "path";
import { convertDocxToHtml, isZipContainer } from "@/lib/documents/docx";
import { renderHtmlDocument } from "@/lib/markdown/render";

const sample = readFileSync(join(__dirname, "fixtures/sample.docx"));

describe("docx conversion", () => {
  it("accepts a zip container, rejects anything else", () => {
    expect(isZipContainer(sample)).toBe(true);
    expect(isZipContainer(Buffer.from("%PDF-1.7"))).toBe(false);
    expect(isZipContainer(Buffer.from([0x50]))).toBe(false);
  });

  it("keeps headings and tables, which the markdown writer would drop", async () => {
    const html = await convertDocxToHtml(sample);
    expect(html).toContain("<h1>Quartalsbericht</h1>");
    expect(html).toContain("<table>");
    expect(html).toContain("<td><p>Januar</p></td>");
  });

  it("rejects a file that is not a document", async () => {
    await expect(convertDocxToHtml(Buffer.from("nope"))).rejects.toThrow();
  });

  it("sanitizes converted html and collects a table of contents", async () => {
    const { html, toc } = await renderHtmlDocument(
      "<h1>Titel</h1><p onclick=\"steal()\">Text</p>" +
        '<script>alert(1)</script><a href="javascript:alert(1)">x</a>'
    );
    expect(html).not.toContain("<script>");
    expect(html).not.toContain("onclick");
    expect(html).not.toContain("javascript:");
    expect(html).toContain("Text");
    expect(toc.map((t) => t.text)).toEqual(["Titel"]);
  });
});
