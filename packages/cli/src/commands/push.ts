import { readFileSync, existsSync } from "node:fs";
import { relative, basename, resolve } from "node:path";
import { createInterface } from "node:readline/promises";
import { stdin as input, stdout as output } from "node:process";
import fg from "fast-glob";
import open from "open";
import pc from "picocolors";
import { api, ApiError, requireAuth } from "../lib/api.js";
import {
  loadLocalConfig,
  saveLocalConfig,
  checksum,
  parseFrontmatter,
  type ReadlaneLocalConfig,
} from "../lib/config.js";

interface PushOptions {
  all?: boolean;
  public?: boolean;
  unlisted?: boolean;
  password?: boolean;
  draft?: boolean;
  publish?: boolean;
  title?: string;
  slug?: string;
  theme?: string;
  open?: boolean;
  force?: boolean;
  yes?: boolean;
}

function resolveFiles(
  config: ReadlaneLocalConfig,
  fileArgs: string[],
  all: boolean
): string[] {
  if (!all && fileArgs.length === 0) {
    throw new Error("Datei angeben oder --all verwenden.");
  }
  if (all) {
    return fg.sync(config.include, {
      ignore: config.exclude,
      onlyFiles: true,
      dot: false,
    });
  }
  return fileArgs.map((f) => relative(process.cwd(), resolve(f)));
}

async function pushOne(
  config: ReadlaneLocalConfig,
  relPath: string,
  opts: PushOptions
) {
  if (!existsSync(relPath)) {
    console.log(
      pc.yellow(
        `! ${relPath} wurde lokal nicht gefunden. Das veröffentlichte Dokument bleibt bestehen.`
      )
    );
    return;
  }

  const raw = readFileSync(relPath, "utf8");
  const { data: fm, content } = parseFrontmatter(raw);
  const body = content.trim() ? content : raw;
  const sum = checksum(body);
  const mapping = config.documents[relPath];

  // Settings priority: CLI > frontmatter > local config > project defaults (server)
  const visibility =
    (opts.public && "public") ||
    (opts.unlisted && "unlisted") ||
    (opts.password && "password") ||
    (fm.visibility as string | undefined) ||
    config.defaultVisibility ||
    "unlisted";

  const status: "draft" | "published" | "archived" = opts.draft
    ? "draft"
    : opts.publish
      ? "published"
      : fm.published === false
        ? "draft"
        : "published";

  const title =
    opts.title ||
    (fm.title as string | undefined) ||
    basename(relPath).replace(/\.(md|markdown|txt)$/i, "");

  const theme =
    opts.theme ||
    (fm.theme as string | undefined) ||
    config.defaultTheme ||
    "system";

  if (mapping?.documentId) {
    if (mapping.lastChecksum === sum && !opts.force) {
      console.log(pc.dim(`– ${relPath} wurde nicht verändert`));
      return;
    }

    try {
      const updated = await api<{
        document: {
          id: string;
          version: number;
          shareUrl: string;
          contentChecksum?: string;
          status: string;
          visibility: string;
        };
      }>(`/api/v1/documents/${mapping.documentId}`, {
        method: "PUT",
        body: JSON.stringify({
          title,
          description: fm.description,
          markdownContent: body,
          visibility,
          status,
          theme,
          width: fm.width,
          font: fm.font,
          toc: fm.toc,
          lineNumbers: fm.lineNumbers,
          slug: opts.slug || fm.slug,
          sourcePath: relPath,
          sourceFilename: basename(relPath),
          sourceChecksum: sum,
          baseVersion: mapping.lastVersion,
          force: opts.force === true,
        }),
      });

      config.documents[relPath] = {
        documentId: updated.document.id,
        slug: (opts.slug || fm.slug || mapping.slug) as string | undefined,
        lastChecksum: sum,
        lastVersion: updated.document.version,
        lastSyncedAt: new Date().toISOString(),
      };
      saveLocalConfig(config);

      console.log(pc.green(`✓ ${relPath} aktualisiert`));
      console.log(`  Status: ${updated.document.visibility}`);
      if (updated.document.shareUrl) {
        console.log(`  URL: ${updated.document.shareUrl}`);
        if (opts.open) await open(updated.document.shareUrl);
      }
    } catch (e) {
      if (e instanceof ApiError && e.code === "DOCUMENT_CONFLICT") {
        console.error(
          pc.red(
            `Konflikt: ${relPath} wurde seit der letzten Synchronisierung online geändert.`
          )
        );
        console.error(pc.dim("  readlane push " + relPath + " --force"));
        console.error(pc.dim("  readlane pull " + relPath));
        console.error(pc.dim("  readlane diff " + relPath));
        process.exitCode = 1;
        return;
      }
      throw e;
    }
    return;
  }

  // Create
  const created = await api<{
    document: {
      id: string;
      version?: number;
      status: string;
      visibility: string;
    };
    shareUrl: string;
  }>(`/api/v1/projects/${config.projectId}/documents`, {
    method: "POST",
    body: JSON.stringify({
      title,
      description: fm.description,
      markdownContent: body,
      visibility,
      status,
      theme,
      width: fm.width,
      font: fm.font,
      toc: fm.toc,
      lineNumbers: fm.lineNumbers,
      slug: opts.slug || fm.slug,
      sourcePath: relPath,
      sourceFilename: basename(relPath),
    }),
  });

  config.documents[relPath] = {
    documentId: created.document.id,
    slug: (opts.slug || fm.slug) as string | undefined,
    lastChecksum: sum,
    lastVersion: created.document.version ?? 1,
    lastSyncedAt: new Date().toISOString(),
  };
  saveLocalConfig(config);

  console.log(pc.green(`✓ ${relPath} veröffentlicht`));
  console.log(`  Projekt: ${config.projectSlug ?? config.projectId}`);
  console.log(`  Status: ${created.document.visibility}`);
  console.log(`  URL: ${created.shareUrl}`);
  if (opts.open) await open(created.shareUrl);
}

export async function pushCommand(files: string[], opts: PushOptions) {
  requireAuth();
  const config = loadLocalConfig();
  if (!config) {
    console.error(pc.red("Kein .readlane.json gefunden. Führen Sie `readlane init` aus."));
    process.exitCode = 1;
    return;
  }

  const list = resolveFiles(config, files, opts.all === true);

  if (opts.all) {
    let changed = 0;
    let neu = 0;
    let unchanged = 0;
    for (const f of list) {
      if (!existsSync(f)) continue;
      const raw = readFileSync(f, "utf8");
      const { content } = parseFrontmatter(raw);
      const body = content.trim() ? content : raw;
      const sum = checksum(body);
      const m = config.documents[f];
      if (!m) neu += 1;
      else if (m.lastChecksum === sum) unchanged += 1;
      else changed += 1;
    }
    console.log(`${changed} Dateien geändert`);
    console.log(`${neu} neue Datei(en)`);
    console.log(`${unchanged} Dateien unverändert`);

    // Local files removed
    for (const [path] of Object.entries(config.documents)) {
      if (!existsSync(path)) {
        console.log(
          pc.yellow(
            `${path} wurde lokal nicht gefunden. Das veröffentlichte Dokument bleibt bestehen.`
          )
        );
      }
    }

    if (!opts.yes) {
      const rl = createInterface({ input, output });
      const ans = (await rl.question("Fortfahren? [y/N] ")).trim().toLowerCase();
      rl.close();
      if (ans !== "y" && ans !== "yes" && ans !== "j" && ans !== "ja") {
        console.log("Abgebrochen.");
        return;
      }
    }
  }

  for (const f of list) {
    await pushOne(config, f, opts);
  }
}
