/**
 * Development seed (backend.md §48).
 * Usage: npm run db:seed
 *
 * Creates Alex Mercer + demo projects/documents.
 * Seed password is for LOCAL DEV ONLY.
 */
import { config } from "dotenv";
config({ path: ".env.local" });
config({ path: ".env" });

import { eq } from "drizzle-orm";
import { getDb } from "./index";
import {
  users,
  projects,
  projectMembers,
  documents,
  subscriptions,
} from "./schema";
import {
  hashSecret,
  createProjectPublicId,
  createSharePublicId,
  sha256,
  createManagementToken,
} from "@/lib/security/tokens";
import { contentChecksum } from "@/lib/utils/checksum";
import { EXAMPLE_MARKDOWN } from "@/lib/markdown/example";

const DEMO_DOCS = [
  { title: "README", file: "README.md", body: EXAMPLE_MARKDOWN },
  {
    title: "Getting Started",
    file: "getting-started.md",
    body: "# Getting Started\n\nWelcome to **Readlane**.\n\n1. Upload a file\n2. Share the link\n3. Done\n",
  },
  {
    title: "API Reference",
    file: "api-reference.md",
    body: "# API Reference\n\nBase path: `/api/v1`\n\nAuth: session cookie or `Authorization: Bearer rln_…`\n",
  },
  {
    title: "Architecture",
    file: "architecture.md",
    body: "# Architecture\n\nNext.js App Router · Neon PostgreSQL · Drizzle · Stripe · Object Storage\n",
  },
  {
    title: "Changelog",
    file: "changelog.md",
    body: "# Changelog\n\n## 0.1.0\n\n- Initial backend\n",
  },
  {
    title: "FAQ",
    file: "faq.md",
    body: "# FAQ\n\n**Is Free permanent?** Yes — one share link, unlimited updates.\n",
  },
];

const PROJECT_NAMES = [
  { name: "Northstar Docs", slug: "northstar-docs" },
  { name: "Lumen Studio", slug: "lumen-studio" },
  { name: "Harbor Labs", slug: "harbor-labs" },
  { name: "Field Notes", slug: "field-notes" },
];

async function main() {
  const db = getDb();
  const email = (
    process.env.SEED_EMAIL ?? "alex@readlane.app"
  ).toLowerCase();
  const password = process.env.SEED_PASSWORD ?? "local-dev-only-password";

  console.log("Seeding Readlane (LOCAL DEV ONLY)…");
  console.log(`  email: ${email}`);
  console.log(`  password: ${password}`);

  const passwordHash = await hashSecret(password);
  let [user] = await db
    .insert(users)
    .values({
      email,
      passwordHash,
      name: "Alex Mercer",
      publicId: `usr_${createSharePublicId()}`,
      emailVerifiedAt: new Date(),
      plan: "pro",
    })
    .onConflictDoNothing()
    .returning();

  if (!user) {
    const existing = await db
      .select()
      .from(users)
      .where(eq(users.email, email))
      .limit(1);
    user = existing[0]!;
    await db
      .update(users)
      .set({
        plan: "pro",
        name: "Alex Mercer",
        emailVerifiedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(users.id, user.id));
  }

  // Ensure a pro subscription row for entitlements
  await db
    .insert(subscriptions)
    .values({
      userId: user.id,
      plan: "pro",
      status: "active",
      currentPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
    })
    .onConflictDoNothing();

  for (const p of PROJECT_NAMES) {
    const existing = await db
      .select()
      .from(projects)
      .where(eq(projects.slug, p.slug))
      .limit(1);
    let project = existing[0];
    if (!project) {
      [project] = await db
        .insert(projects)
        .values({
          publicId: createProjectPublicId(),
          ownerId: user.id,
          name: p.name,
          slug: p.slug,
          description: `Seed project: ${p.name}`,
        })
        .returning();
      if (project) {
        await db.insert(projectMembers).values({
          projectId: project.id,
          userId: user.id,
          role: "owner",
        });
      }
    }
    if (!project) continue;

    for (const doc of DEMO_DOCS.slice(0, 2)) {
      const managementToken = createManagementToken();
      const checksum = contentChecksum(doc.body);
      await db.insert(documents).values({
        publicId: createSharePublicId(),
        managementTokenHash: sha256(managementToken),
        title: doc.title,
        description: `Seed: ${doc.file}`,
        markdownContent: doc.body,
        contentChecksum: checksum,
        visibility: "unlisted",
        status: "published",
        projectId: project.id,
        sourceFilename: doc.file,
        createdBy: user.id,
        updatedBy: user.id,
        publishedAt: new Date(),
        rendererType: "markdown",
      });
    }
  }

  console.log("Seed complete.");
  console.log({
    email,
    password,
    note: "LOCAL DEV ONLY — never use seed passwords in production",
  });
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
