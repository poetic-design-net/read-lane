/**
 * File format detection and renderer mapping (v2 multi-format).
 */

export const RENDERER_TYPES = [
  "markdown",
  "text",
  "code",
  "csv",
  "pdf",
  "html",
  "image",
  "docx",
] as const;

export type RendererType = (typeof RENDERER_TYPES)[number];

const CODE_EXT = new Set([
  "js",
  "ts",
  "jsx",
  "tsx",
  "css",
  "scss",
  "html",
  "htm",
  "json",
  "yaml",
  "yml",
  "xml",
  "sql",
  "py",
  "php",
  "rb",
  "go",
  "rs",
  "java",
  "sh",
  "bash",
  "zsh",
  "env",
  "toml",
  "ini",
  "c",
  "cpp",
  "h",
  "hpp",
  "kt",
  "swift",
  "vue",
  "svelte",
]);

const IMAGE_EXT = new Set(["png", "jpg", "jpeg", "webp", "gif"]);

const MARKDOWN_EXT = new Set(["md", "markdown", "mdx"]);

/**
 * Filenames that must never be uploaded, checked on client and server.
 * Lives here (not in files/service) so the browser can reject them without
 * pulling in crypto, drizzle and the db connection.
 */
export const BLOCKED_FILENAMES = [
  /^\.env(\.|$)/i,
  /\.pem$/i,
  /\.key$/i,
  /^id_rsa/i,
  /^id_ed25519/i,
  /credentials\.json$/i,
  /service-account.*\.json$/i,
];

export function isBlockedFilename(filename: string): boolean {
  const base = filename.split(/[/\\]/).pop() ?? filename;
  return BLOCKED_FILENAMES.some((re) => re.test(base));
}

export function sanitizeFilename(name: string): string {
  const base = name.split(/[/\\]/).pop() ?? "file";
  return (
    base
      .replace(/[^\w.\- ()[\]]+/g, "_")
      .replace(/^\.+/, "")
      .slice(0, 180) || "file"
  );
}

/** `accept` attribute for every file input — single source of truth. */
export const ACCEPT_ATTRIBUTE = [
  ...[...MARKDOWN_EXT].map((e) => `.${e}`),
  ".txt",
  ".csv",
  ".pdf",
  ...[...IMAGE_EXT].map((e) => `.${e}`),
  ...[...CODE_EXT].map((e) => `.${e}`),
].join(",");

/** Extensions free tier may publish as content (PDF/image need storage). */
export const FREE_UPLOAD_EXTENSIONS = [
  ".md",
  ".markdown",
  ".mdx",
  ".txt",
  ".csv",
  ".js",
  ".ts",
  ".jsx",
  ".tsx",
  ".css",
  ".scss",
  ".json",
  ".yaml",
  ".yml",
  ".xml",
  ".sql",
  ".py",
  ".php",
  ".rb",
  ".go",
  ".rs",
  ".java",
  ".sh",
  ".html",
  ".htm",
] as const;

export function extensionOf(filename: string): string {
  const base = filename.split(/[/\\]/).pop() ?? filename;
  // .env.example → example
  if (base.endsWith(".env.example")) return "env";
  const i = base.lastIndexOf(".");
  if (i <= 0) return "";
  return base.slice(i + 1).toLowerCase();
}

export function detectRenderer(
  filename: string,
  mimeType?: string | null
): RendererType {
  const ext = extensionOf(filename);
  const mime = (mimeType ?? "").toLowerCase();

  if (MARKDOWN_EXT.has(ext) || mime.includes("markdown")) return "markdown";
  if (ext === "txt" || mime === "text/plain") return "text";
  if (ext === "csv" || mime === "text/csv") return "csv";
  if (ext === "pdf" || mime === "application/pdf") return "pdf";
  if (IMAGE_EXT.has(ext) || mime.startsWith("image/")) return "image";
  if (ext === "docx") return "docx";
  // HTML can be sanitized page or code — default code view for safety of raw upload
  if (ext === "html" || ext === "htm") return "html";
  if (CODE_EXT.has(ext)) return "code";
  if (mime.startsWith("text/")) return "text";
  return "text";
}

export function languageFromExtension(ext: string): string {
  const map: Record<string, string> = {
    js: "javascript",
    jsx: "jsx",
    ts: "typescript",
    tsx: "tsx",
    py: "python",
    rb: "ruby",
    rs: "rust",
    go: "go",
    java: "java",
    php: "php",
    sh: "bash",
    bash: "bash",
    css: "css",
    scss: "scss",
    json: "json",
    yaml: "yaml",
    yml: "yaml",
    xml: "xml",
    sql: "sql",
    html: "html",
    htm: "html",
    md: "markdown",
    env: "dotenv",
  };
  return map[ext] ?? (ext || "text");
}

export function isTextBasedRenderer(r: RendererType): boolean {
  return (
    r === "markdown" ||
    r === "text" ||
    r === "code" ||
    r === "csv" ||
    r === "html"
  );
}

/** Formats that live in object storage instead of the content column. */
export function isBinaryRenderer(r: RendererType): boolean {
  return !isTextBasedRenderer(r);
}
