import { defaultSchema, type Options as SanitizeOptions } from "rehype-sanitize";

/**
 * Extended sanitize schema: GFM + safe code highlighting classes.
 * Blocks scripts, event handlers, javascript: URLs, dangerous data: URLs.
 */
export const markdownSanitizeSchema: SanitizeOptions = {
  ...defaultSchema,
  tagNames: [
    ...(defaultSchema.tagNames ?? []),
    "input", // checkboxes
    "section",
    "sup",
    "sub",
    "details",
    "summary",
  ],
  attributes: {
    ...defaultSchema.attributes,
    code: [
      ...(defaultSchema.attributes?.code ?? []),
      ["className"],
      ["data-language"],
    ],
    pre: [...(defaultSchema.attributes?.pre ?? []), ["className"], ["style"]],
    span: [
      ...(defaultSchema.attributes?.span ?? []),
      ["className"],
      ["style"],
    ],
    a: [
      ...(defaultSchema.attributes?.a ?? []),
      ["className"],
      ["target"],
      ["rel"],
    ],
    img: [
      ...(defaultSchema.attributes?.img ?? []),
      ["className"],
      ["loading"],
      ["decoding"],
    ],
    input: [
      ["type", "checkbox"],
      ["checked"],
      ["disabled"],
      ["className"],
    ],
    h1: [...(defaultSchema.attributes?.h1 ?? []), ["id"], ["className"]],
    h2: [...(defaultSchema.attributes?.h2 ?? []), ["id"], ["className"]],
    h3: [...(defaultSchema.attributes?.h3 ?? []), ["id"], ["className"]],
    h4: [...(defaultSchema.attributes?.h4 ?? []), ["id"], ["className"]],
    h5: [...(defaultSchema.attributes?.h5 ?? []), ["id"], ["className"]],
    h6: [...(defaultSchema.attributes?.h6 ?? []), ["id"], ["className"]],
    div: [...(defaultSchema.attributes?.div ?? []), ["className"]],
    table: [...(defaultSchema.attributes?.table ?? []), ["className"]],
    th: [...(defaultSchema.attributes?.th ?? []), ["align"], ["className"]],
    td: [...(defaultSchema.attributes?.td ?? []), ["align"], ["className"]],
    section: [["className"], ["data-footnotes"]],
    li: [...(defaultSchema.attributes?.li ?? []), ["className"], ["id"]],
  },
  protocols: {
    ...defaultSchema.protocols,
    href: ["http", "https", "mailto"],
    src: ["http", "https"],
  },
  clobberPrefix: "user-content-",
};
