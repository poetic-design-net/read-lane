import { readFileSync, existsSync } from "node:fs";
import pc from "picocolors";
import { api, requireAuth } from "../lib/api.js";
import { loadLocalConfig, parseFrontmatter } from "../lib/config.js";

export async function diffCommand(file: string) {
  requireAuth();
  const config = loadLocalConfig();
  if (!config?.documents[file]) {
    console.error(pc.red(`Keine Zuordnung für ${file}.`));
    process.exitCode = 1;
    return;
  }
  if (!existsSync(file)) {
    console.error(pc.red(`Datei fehlt lokal: ${file}`));
    process.exitCode = 1;
    return;
  }

  const docId = config.documents[file].documentId;
  const res = await api<{
    document: { markdownContent: string; version: number };
  }>(`/api/v1/documents/${docId}`);

  const raw = readFileSync(file, "utf8");
  const { content } = parseFrontmatter(raw);
  const local = content.trim() ? content : raw;
  const remote = res.document.markdownContent;

  if (local === remote) {
    console.log(pc.green("Keine Unterschiede."));
    return;
  }

  console.log(pc.bold(`Diff: ${file} (remote v${res.document.version})`));
  console.log(pc.dim("--- remote"));
  console.log(pc.dim("+++ local"));
  // Simple line-based unified-ish diff (minimal, no dependency)
  const a = remote.split("\n");
  const b = local.split("\n");
  const max = Math.max(a.length, b.length);
  for (let i = 0; i < max; i++) {
    if (a[i] === b[i]) continue;
    if (a[i] != null) console.log(pc.red(`- ${a[i]}`));
    if (b[i] != null) console.log(pc.green(`+ ${b[i]}`));
  }
}
