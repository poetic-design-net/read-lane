import { existsSync, readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { homedir } from "node:os";
import { join, dirname } from "node:path";
import { createHash } from "node:crypto";

export const DEFAULT_API_URL =
  process.env.READLANE_API_URL ??
  process.env.NEXT_PUBLIC_APP_URL ??
  "http://localhost:3000";

export interface ReadlaneLocalConfig {
  version: 1;
  projectId: string;
  projectSlug?: string;
  defaultVisibility?: "public" | "unlisted" | "password";
  defaultTheme?: "light" | "dark" | "system";
  include: string[];
  exclude: string[];
  documents: Record<
    string,
    {
      documentId: string;
      slug?: string;
      lastChecksum?: string;
      lastVersion?: number;
      lastSyncedAt?: string;
    }
  >;
}

export function findConfigPath(cwd = process.cwd()): string | null {
  let dir = cwd;
  for (let i = 0; i < 12; i++) {
    const p = join(dir, ".readlane.json");
    if (existsSync(p)) return p;
    const parent = dirname(dir);
    if (parent === dir) break;
    dir = parent;
  }
  return null;
}

export function loadLocalConfig(cwd = process.cwd()): ReadlaneLocalConfig | null {
  const path = findConfigPath(cwd);
  if (!path) return null;
  return JSON.parse(readFileSync(path, "utf8")) as ReadlaneLocalConfig;
}

export function saveLocalConfig(
  config: ReadlaneLocalConfig,
  cwd = process.cwd()
) {
  const existing = findConfigPath(cwd);
  const path = existing ?? join(cwd, ".readlane.json");
  writeFileSync(path, JSON.stringify(config, null, 2) + "\n", {
    encoding: "utf8",
    mode: 0o644,
  });
  return path;
}

function credentialsPath() {
  return join(homedir(), ".config", "readlane", "credentials.json");
}

export function saveToken(token: string, apiUrl: string) {
  const path = credentialsPath();
  mkdirSync(dirname(path), { recursive: true, mode: 0o700 });
  writeFileSync(
    path,
    JSON.stringify({ token, apiUrl, savedAt: new Date().toISOString() }, null, 2) +
      "\n",
    { encoding: "utf8", mode: 0o600 }
  );
}

export function loadToken(): { token: string; apiUrl: string } | null {
  if (process.env.READLANE_TOKEN) {
    return {
      token: process.env.READLANE_TOKEN,
      apiUrl: DEFAULT_API_URL,
    };
  }
  const path = credentialsPath();
  if (!existsSync(path)) return null;
  try {
    const data = JSON.parse(readFileSync(path, "utf8")) as {
      token: string;
      apiUrl?: string;
    };
    if (!data.token) return null;
    return { token: data.token, apiUrl: data.apiUrl ?? DEFAULT_API_URL };
  } catch {
    return null;
  }
}

export function clearToken() {
  const path = credentialsPath();
  if (existsSync(path)) {
    writeFileSync(path, "{}\n", { mode: 0o600 });
  }
}

export function checksum(content: string): string {
  return createHash("sha256").update(content, "utf8").digest("hex");
}

export function parseFrontmatter(raw: string): {
  data: Record<string, unknown>;
  content: string;
} {
  if (!raw.startsWith("---")) return { data: {}, content: raw };
  const end = raw.indexOf("\n---", 3);
  if (end === -1) return { data: {}, content: raw };
  const block = raw.slice(3, end).trim();
  const content = raw.slice(end + 4).replace(/^\n/, "");
  const data: Record<string, unknown> = {};
  for (const line of block.split("\n")) {
    const t = line.trim();
    if (!t || t.startsWith("#")) continue;
    const i = t.indexOf(":");
    if (i === -1) continue;
    const key = t.slice(0, i).trim();
    let value: string | boolean = t.slice(i + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    } else if (value === "true") value = true;
    else if (value === "false") value = false;
    data[key] = value;
  }
  return { data, content };
}
