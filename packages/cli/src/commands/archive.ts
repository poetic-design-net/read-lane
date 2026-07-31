import pc from "picocolors";
import { api, requireAuth } from "../lib/api.js";
import { loadLocalConfig } from "../lib/config.js";

export async function archiveCommand(file: string) {
  requireAuth();
  const config = loadLocalConfig();
  if (!config?.documents[file]) {
    console.error(pc.red(`Keine Zuordnung für ${file}.`));
    process.exitCode = 1;
    return;
  }
  const docId = config.documents[file].documentId;
  await api(`/api/v1/documents/${docId}/archive`, {
    method: "POST",
    body: "{}",
  });
  console.log(pc.green(`✓ ${file} archiviert`));
}
