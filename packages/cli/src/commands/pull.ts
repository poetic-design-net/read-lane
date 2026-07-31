import { writeFileSync, existsSync } from "node:fs";
import { createInterface } from "node:readline/promises";
import { stdin as input, stdout as output } from "node:process";
import pc from "picocolors";
import { api, requireAuth } from "../lib/api.js";
import {
  loadLocalConfig,
  saveLocalConfig,
  checksum,
} from "../lib/config.js";

export async function pullCommand(file: string, opts: { yes?: boolean } = {}) {
  requireAuth();
  const config = loadLocalConfig();
  if (!config?.documents[file]) {
    console.error(pc.red(`Keine Zuordnung für ${file}.`));
    process.exitCode = 1;
    return;
  }

  const docId = config.documents[file].documentId;
  const res = await api<{
    document: {
      markdownContent: string;
      version: number;
      contentChecksum: string;
      title: string;
    };
  }>(`/api/v1/documents/${docId}`);

  if (existsSync(file) && !opts.yes) {
    const rl = createInterface({ input, output });
    const ans = (
      await rl.question(`Lokale Datei ${file} überschreiben? [y/N] `)
    )
      .trim()
      .toLowerCase();
    rl.close();
    if (ans !== "y" && ans !== "yes" && ans !== "j" && ans !== "ja") {
      console.log("Abgebrochen.");
      return;
    }
  }

  writeFileSync(file, res.document.markdownContent, "utf8");
  config.documents[file] = {
    ...config.documents[file],
    lastChecksum: checksum(res.document.markdownContent),
    lastVersion: res.document.version,
    lastSyncedAt: new Date().toISOString(),
  };
  saveLocalConfig(config);
  console.log(pc.green(`✓ ${file} von remote geladen (v${res.document.version})`));
}
