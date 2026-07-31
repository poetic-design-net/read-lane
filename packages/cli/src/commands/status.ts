import { existsSync, readFileSync } from "node:fs";
import pc from "picocolors";
import { api, requireAuth } from "../lib/api.js";
import { loadLocalConfig, checksum, parseFrontmatter } from "../lib/config.js";

export async function statusCommand() {
  requireAuth();
  const config = loadLocalConfig();
  if (!config) {
    console.error(pc.red("Kein .readlane.json. Führen Sie `readlane init` aus."));
    process.exitCode = 1;
    return;
  }

  const remote = await api<{
    documents: Array<{
      id: string;
      version: number;
      contentChecksum: string;
      sourcePath: string | null;
      title: string;
    }>;
  }>(`/api/v1/projects/${config.projectId}/documents`);

  const byId = new Map(remote.documents.map((d) => [d.id, d]));
  const paths = new Set([
    ...Object.keys(config.documents),
    ...remote.documents.map((d) => d.sourcePath).filter(Boolean) as string[],
  ]);

  for (const path of [...paths].sort()) {
    const mapping = config.documents[path];
    const localExists = existsSync(path);

    if (!localExists && mapping) {
      console.log(`${path.padEnd(32)} ${pc.yellow("lokal nicht gefunden")}`);
      continue;
    }
    if (!mapping && localExists) {
      console.log(`${path.padEnd(32)} ${pc.cyan("nicht veröffentlicht")}`);
      continue;
    }
    if (!mapping) continue;

    const remoteDoc = byId.get(mapping.documentId);
    if (!remoteDoc) {
      console.log(`${path.padEnd(32)} ${pc.red("remote fehlt")}`);
      continue;
    }

    const raw = readFileSync(path, "utf8");
    const { content } = parseFrontmatter(raw);
    const body = content.trim() ? content : raw;
    const sum = checksum(body);

    if (
      mapping.lastVersion != null &&
      remoteDoc.version > mapping.lastVersion &&
      sum !== remoteDoc.contentChecksum
    ) {
      console.log(`${path.padEnd(32)} ${pc.red("Konflikt")}`);
    } else if (remoteDoc.version > (mapping.lastVersion ?? 0)) {
      console.log(`${path.padEnd(32)} ${pc.magenta("remote verändert")}`);
    } else if (sum !== mapping.lastChecksum) {
      console.log(`${path.padEnd(32)} ${pc.yellow("lokal verändert")}`);
    } else {
      console.log(`${path.padEnd(32)} ${pc.green("synchron")}`);
    }
  }
}
