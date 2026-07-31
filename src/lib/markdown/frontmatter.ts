import { frontmatterSchema } from "@/lib/validation/document";
import type { z } from "zod";

export type Frontmatter = z.infer<typeof frontmatterSchema>;

export interface ParsedMarkdown {
  frontmatter: Frontmatter;
  content: string;
}

/**
 * Parse simple YAML-like frontmatter (key: value) without a heavy YAML dependency.
 * Supports strings, booleans, and basic unquoted values.
 */
export function parseFrontmatter(raw: string): ParsedMarkdown {
  if (!raw.startsWith("---")) {
    return { frontmatter: {}, content: raw };
  }

  const end = raw.indexOf("\n---", 3);
  if (end === -1) {
    return { frontmatter: {}, content: raw };
  }

  const block = raw.slice(3, end).trim();
  const content = raw.slice(end + 4).replace(/^\n/, "");
  const data: Record<string, unknown> = {};

  for (const line of block.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const colon = trimmed.indexOf(":");
    if (colon === -1) continue;
    const key = trimmed.slice(0, colon).trim();
    let value: string | boolean = trimmed.slice(colon + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    } else if (value === "true") {
      value = true;
    } else if (value === "false") {
      value = false;
    }
    data[key] = value;
  }

  const parsed = frontmatterSchema.safeParse(data);
  return {
    frontmatter: parsed.success ? parsed.data : {},
    content,
  };
}
