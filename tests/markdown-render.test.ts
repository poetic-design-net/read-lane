import { describe, it, expect } from "vitest";
import { renderMarkdown } from "@/lib/markdown/render";

describe("renderMarkdown", () => {
  it("renders headings and strips scripts", async () => {
    const { html, toc } = await renderMarkdown(
      `# Hello\n\n<script>alert(1)</script>\n\n**bold**\n`
    );
    expect(html).toContain("Hello");
    expect(html).toContain("<strong>");
    expect(html.toLowerCase()).not.toContain("<script");
    expect(toc.length).toBeGreaterThan(0);
  });

  it("renders gfm tables", async () => {
    const md = `| A | B |\n| - | - |\n| 1 | 2 |`;
    const { html } = await renderMarkdown(md);
    expect(html).toContain("<table");
  });

  it("highlights code blocks", async () => {
    const md = "```ts\nconst x = 1;\n```";
    const { html } = await renderMarkdown(md);
    expect(html).toMatch(/code-block|shiki|const/);
  });
});
