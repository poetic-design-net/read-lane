import { createInterface } from "node:readline/promises";
import { stdin as input, stdout as output } from "node:process";
import { basename } from "node:path";
import pc from "picocolors";
import { api, requireAuth } from "../lib/api.js";
import { saveLocalConfig, type ReadlaneLocalConfig } from "../lib/config.js";

export async function initCommand() {
  requireAuth();
  const rl = createInterface({ input, output });

  const { projects } = await api<{
    projects: Array<{ id: string; name: string; slug: string }>;
  }>("/api/v1/projects");

  console.log(pc.bold("Projekt verbinden"));
  if (projects.length) {
    console.log("Vorhandene Projekte:");
    projects.forEach((p, i) => {
      console.log(`  ${i + 1}) ${p.name} (${p.id})`);
    });
    console.log(`  n) Neues Projekt erstellen`);
  } else {
    console.log("Noch keine Projekte — es wird ein neues erstellt.");
  }

  let project: { id: string; name: string; slug: string };

  if (projects.length === 0) {
    const name =
      (await rl.question(`Projektname [${basename(process.cwd())}]: `)).trim() ||
      basename(process.cwd());
    const created = await api<{
      project: { id: string; name: string; slug: string };
    }>("/api/v1/projects", {
      method: "POST",
      body: JSON.stringify({ name }),
    });
    project = created.project;
  } else {
    const choice = (await rl.question("Auswahl: ")).trim().toLowerCase();
    if (choice === "n" || choice === "new") {
      const name =
        (await rl.question(`Projektname [${basename(process.cwd())}]: `)).trim() ||
        basename(process.cwd());
      const created = await api<{
        project: { id: string; name: string; slug: string };
      }>("/api/v1/projects", {
        method: "POST",
        body: JSON.stringify({ name }),
      });
      project = created.project;
    } else {
      const idx = Number(choice) - 1;
      const selected = projects[idx];
      if (!selected) {
        console.error(pc.red("Ungültige Auswahl."));
        rl.close();
        process.exitCode = 1;
        return;
      }
      project = selected;
    }
  }

  const config: ReadlaneLocalConfig = {
    version: 1,
    projectId: project.id,
    projectSlug: project.slug,
    defaultVisibility: "unlisted",
    defaultTheme: "system",
    include: ["README.md", "docs/**/*.md", "**/*.md"],
    exclude: ["node_modules/**", ".next/**", "private/**", "**/node_modules/**"],
    documents: {},
  };

  const path = saveLocalConfig(config);
  rl.close();
  console.log(pc.green(`✓ Verbunden mit „${project.name}“`));
  console.log(pc.dim(`Konfiguration: ${path}`));
  console.log(pc.dim("Keine Secrets in .readlane.json gespeichert."));
}
