#!/usr/bin/env node
import { Command } from "commander";
import { loginCommand } from "./commands/login.js";
import { logoutCommand, whoamiCommand } from "./commands/whoami.js";
import { initCommand } from "./commands/init.js";
import { pushCommand } from "./commands/push.js";
import { statusCommand } from "./commands/status.js";
import { openCommand } from "./commands/open.js";
import { pullCommand } from "./commands/pull.js";
import { diffCommand } from "./commands/diff.js";
import { archiveCommand } from "./commands/archive.js";
import {
  listCommand,
  projectsCommand,
  unlinkCommand,
} from "./commands/list.js";

const program = new Command();

program
  .name("readlane")
  .description("Publish and sync Markdown with Readlane")

  .version("0.1.0");

program
  .command("login")
  .description("Authenticate CLI via browser device flow")
  .option("--api-url <url>", "API base URL")
  .action(async (opts) => {
    await loginCommand(opts);
  });

program
  .command("logout")
  .description("Remove local credentials")
  .action(async () => {
    await logoutCommand();
  });

program
  .command("whoami")
  .description("Show authenticated user")
  .action(async () => {
    await whoamiCommand();
  });

program
  .command("init")
  .description("Link current folder to a Readlane project")

  .action(async () => {
    await initCommand();
  });

program
  .command("projects")
  .description("List remote projects")
  .action(async () => {
    await projectsCommand();
  });

program
  .command("push")
  .description("Upload or update Markdown file(s)")
  .argument("[files...]", "Markdown files")
  .option("--all", "Push all include-matched files")
  .option("--public", "Visibility public")
  .option("--unlisted", "Visibility unlisted")
  .option("--password", "Visibility password (configure password in dashboard)")
  .option("--draft", "Save as draft")
  .option("--publish", "Mark published")
  .option("--title <title>", "Document title")
  .option("--slug <slug>", "Document slug")
  .option("--theme <theme>", "light|dark|system")
  .option("--open", "Open share URL after push")
  .option("--force", "Overwrite remote conflicts")
  .option("--yes", "Skip confirmation (CI)")
  .action(async (files, opts) => {
    await pushCommand(files, opts);
  });

program
  .command("status")
  .description("Show local/remote sync status")
  .action(async () => {
    await statusCommand();
  });

program
  .command("open")
  .description("Open project or document in browser")
  .argument("[file]", "Local markdown path")
  .option("--manage", "Open short-lived management URL")
  .action(async (file, opts) => {
    await openCommand(file, opts);
  });

program
  .command("pull")
  .description("Download remote markdown into local file")
  .argument("<file>", "Local path")
  .option("--yes", "Overwrite without prompt")
  .action(async (file, opts) => {
    await pullCommand(file, opts);
  });

program
  .command("diff")
  .description("Show local vs remote differences")
  .argument("<file>", "Local path")
  .action(async (file) => {
    await diffCommand(file);
  });

program
  .command("archive")
  .description("Archive remote document for a local file")
  .argument("<file>", "Local path")
  .action(async (file) => {
    await archiveCommand(file);
  });

program
  .command("list")
  .description("List remote documents in linked project")
  .action(async () => {
    await listCommand();
  });

program
  .command("unlink")
  .description("Remove local .readlane.json")
  .action(async () => {
    await unlinkCommand();
  });

program.parseAsync(process.argv).catch((err: unknown) => {
  console.error(err instanceof Error ? err.message : err);
  process.exitCode = 1;
});
