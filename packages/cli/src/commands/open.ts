import open from "open";
import pc from "picocolors";
import { api, requireAuth } from "../lib/api.js";
import { loadLocalConfig, DEFAULT_API_URL, loadToken } from "../lib/config.js";

export async function openCommand(
  file?: string,
  opts: { manage?: boolean } = {}
) {
  requireAuth();
  const config = loadLocalConfig();
  const auth = loadToken();
  const base = auth?.apiUrl ?? DEFAULT_API_URL;

  if (!file) {
    if (!config) {
      console.error(pc.red("Kein Projekt verbunden."));
      process.exitCode = 1;
      return;
    }
    const url = `${base}/dashboard/projects/${config.projectId}`;
    console.log(url);
    await open(url);
    return;
  }

  if (!config?.documents[file]) {
    console.error(pc.red(`Keine Zuordnung für ${file}. Zuerst pushen.`));
    process.exitCode = 1;
    return;
  }

  const docId = config.documents[file].documentId;

  if (opts.manage) {
    const res = await api<{ manageUrl: string }>(
      `/api/v1/documents/${docId}/management-url`,
      { method: "POST", body: "{}" }
    );
    console.log(res.manageUrl);
    await open(res.manageUrl);
    return;
  }

  const doc = await api<{ document: { shareUrl: string | null } }>(
    `/api/v1/documents/${docId}`
  );
  const url = doc.document.shareUrl;
  if (!url) {
    console.error(pc.red("Kein Share-Link (Entwurf?)."));
    process.exitCode = 1;
    return;
  }
  console.log(url);
  await open(url);
}
