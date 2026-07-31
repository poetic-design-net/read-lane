import pc from "picocolors";
import { api, requireAuth } from "../lib/api.js";
import { loadLocalConfig } from "../lib/config.js";

export async function listCommand() {
  requireAuth();
  const config = loadLocalConfig();
  if (!config) {
    console.error(pc.red("Kein Projekt verbunden."));
    process.exitCode = 1;
    return;
  }
  const res = await api<{
    documents: Array<{
      id: string;
      title: string;
      status: string;
      visibility: string;
      sourcePath: string | null;
      shareUrl: string | null;
    }>;
  }>(`/api/v1/projects/${config.projectId}/documents`);

  for (const d of res.documents) {
    console.log(
      `${(d.sourcePath ?? d.id).padEnd(28)} ${d.status.padEnd(10)} ${d.visibility.padEnd(10)} ${d.title}`
    );
    if (d.shareUrl) console.log(pc.dim(`  ${d.shareUrl}`));
  }
}

export async function projectsCommand() {
  requireAuth();
  const res = await api<{
    projects: Array<{ id: string; name: string; slug: string; documentCount: number }>;
  }>("/api/v1/projects");
  for (const p of res.projects) {
    console.log(`${p.name.padEnd(24)} ${p.id}  (${p.documentCount} docs)`);
  }
}

export async function unlinkCommand() {
  const { existsSync, unlinkSync } = await import("node:fs");
  const { join } = await import("node:path");
  const path = join(process.cwd(), ".readlane.json");
  if (!existsSync(path)) {
    console.log("Keine lokale Konfiguration.");
    return;
  }
  unlinkSync(path);
  console.log(pc.green("✓ Lokale Projektverbindung entfernt (.readlane.json)."));
}
