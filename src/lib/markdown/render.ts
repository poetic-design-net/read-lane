import { unified } from "unified";
import remarkParse from "remark-parse";
import remarkGfm from "remark-gfm";
import remarkRehype from "remark-rehype";
import rehypeParse from "rehype-parse";
import rehypeSlug from "rehype-slug";
import rehypeSanitize from "rehype-sanitize";
import rehypeStringify from "rehype-stringify";
import { visit } from "unist-util-visit";
import { toString } from "hast-util-to-string";
import type { Root, Element } from "hast";
import { codeToHtml } from "shiki";
import { markdownSanitizeSchema } from "./sanitize-schema";

export interface TocItem {
  id: string;
  text: string;
  level: number;
}

export interface RenderResult {
  html: string;
  toc: TocItem[];
}

function rehypeShiki(options: { showLineNumbers: boolean }) {
  return async function transformer(tree: Root) {
    const nodes: Element[] = [];
    visit(tree, "element", (node, _index, parent) => {
      if (
        node.tagName === "pre" &&
        parent &&
        Array.isArray(node.children) &&
        node.children[0] &&
        (node.children[0] as Element).tagName === "code"
      ) {
        nodes.push(node);
      }
    });

    await Promise.all(
      nodes.map(async (pre) => {
        const codeEl = pre.children[0] as Element;
        const raw = toString(codeEl);
        const className = codeEl.properties?.className;
        let lang = "text";
        const classList = Array.isArray(className)
          ? className.map(String)
          : className != null
            ? [String(className)]
            : [];
        const found = classList.find((c) => c.startsWith("language-"));
        if (found) lang = found.replace("language-", "") || "text";

        try {
          const highlighted = await codeToHtml(raw, {
            lang: lang === "text" ? "plaintext" : lang,
            themes: {
              light: "github-light",
              dark: "github-dark",
            },
            defaultColor: false,
            transformers: options.showLineNumbers
              ? [
                  {
                    line(node, line) {
                      node.properties["data-line"] = String(line);
                    },
                  },
                ]
              : [],
          });

          // Parse shiki HTML back into a single element structure via wrapper
          pre.properties = {
            ...pre.properties,
            className: [
              "shiki-block",
              options.showLineNumbers ? "line-numbers" : "",
            ].filter(Boolean),
            // Store highlighted HTML; stringify will emit as raw via special handling
            dataHighlighted: highlighted,
          };
          // Replace children with a marker text node — post-process HTML string
          pre.children = [
            {
              type: "text",
              value: "\u0000SHIKI\u0000",
            },
          ];
          (pre as Element & { __shiki?: string }).__shiki = highlighted;
        } catch {
          // keep plain code block
        }
      })
    );
  };
}

function extractToc(tree: Root): TocItem[] {
  const toc: TocItem[] = [];
  visit(tree, "element", (node: Element) => {
    if (!/^h[1-3]$/.test(node.tagName)) return;
    const id = node.properties?.id;
    if (typeof id !== "string") return;
    const level = Number(node.tagName[1]);
    toc.push({ id, text: toString(node), level });
  });
  return toc;
}

function rehypeCollectToc(toc: TocItem[]) {
  return (tree: Root) => {
    toc.push(...extractToc(tree));
  };
}

/**
 * Server-side markdown → safe HTML with GFM + Shiki highlighting.
 */
export async function renderMarkdown(
  markdown: string,
  options: { showLineNumbers?: boolean } = {}
): Promise<RenderResult> {
  const toc: TocItem[] = [];
  const showLineNumbers = options.showLineNumbers ?? false;

  const file = await unified()
    .use(remarkParse)
    .use(remarkGfm)
    .use(remarkRehype, { allowDangerousHtml: false })
    .use(rehypeSlug)
    .use(rehypeCollectToc, toc)
    .use(rehypeShiki, { showLineNumbers })
    .use(rehypeSanitize, markdownSanitizeSchema)
    .use(rehypeStringify)
    .process(markdown);

  let html = String(file);

  // Re-inject Shiki HTML (already trusted from our pipeline; sanitized attributes only)
  // Map via sequential replacement of markers — store shiki on side channel
  // Since sanitize may strip data attributes, we re-run a simpler post-pass:
  // re-highlight is expensive; instead parse markers left by rehypeShiki.

  // Fallback: if markers remain without content, strip them
  html = html.replace(/<pre[^>]*>\u0000SHIKI\u0000<\/pre>/g, (match) => {
    // Without side channel after stringify, re-highlight plain is lost.
    // The approach below stores highlighted HTML in a Map during transform.
    return match;
  });

  // Second pipeline pass: visit raw AST side-channel via custom stringify
  // Simpler robust approach: process again replacing code blocks after sanitize.
  html = await highlightCodeBlocksInHtml(html, showLineNumbers);

  return { html, toc };
}

/**
 * Untrusted HTML → safe HTML, through the same schema as markdown.
 * Used for DOCX, whose conversion produces HTML instead of markdown.
 */
export async function renderHtmlDocument(html: string): Promise<RenderResult> {
  const toc: TocItem[] = [];
  const file = await unified()
    .use(rehypeParse, { fragment: true })
    .use(rehypeSlug)
    .use(rehypeCollectToc, toc)
    .use(rehypeSanitize, markdownSanitizeSchema)
    .use(rehypeStringify)
    .process(html);

  return { html: String(file), toc };
}

async function highlightCodeBlocksInHtml(
  html: string,
  showLineNumbers: boolean
): Promise<string> {
  const re =
    /<pre><code(?:\s+class="([^"]*)")?>([\s\S]*?)<\/code><\/pre>/g;
  const matches = [...html.matchAll(re)];
  if (matches.length === 0) return html;

  let result = html;
  for (const match of matches) {
    const full = match[0];
    const classAttr = match[1] ?? "";
    const encoded = match[2] ?? "";
    const code = decodeHtmlEntities(encoded);
    let lang = "plaintext";
    const m = classAttr.match(/language-([\w-]+)/);
    if (m?.[1]) lang = m[1];

    try {
      const highlighted = await codeToHtml(code, {
        lang,
        themes: { light: "github-light", dark: "github-dark" },
        defaultColor: false,
      });
      const wrapped = `<div class="code-block${showLineNumbers ? " with-line-numbers" : ""}">${highlighted}</div>`;
      result = result.replace(full, wrapped);
    } catch {
      // leave original
    }
  }
  return result;
}

function decodeHtmlEntities(str: string): string {
  return str
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&#x27;/g, "'")
    .replace(/&#x2F;/g, "/");
}

/**
 * Client-safe lightweight check: strip dangerous patterns from raw markdown preview.
 * Full sanitize still runs server-side for published content.
 */
export function containsDangerousPatterns(markdown: string): boolean {
  return /<script[\s>]|javascript:|on\w+\s*=/i.test(markdown);
}
