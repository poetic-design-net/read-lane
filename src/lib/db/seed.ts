/**
 * Optional seed script: creates a demo user + project.
 * Usage: npx tsx src/lib/db/seed.ts
 */
import { config } from "dotenv";
config({ path: ".env.local" });
config({ path: ".env" });

import { getDb } from "./index";
import { users, projects, projectMembers, documents } from "./schema";
import { hashSecret, createProjectPublicId, createSharePublicId, sha256, createManagementToken } from "@/lib/security/tokens";
import { contentChecksum } from "@/lib/utils/checksum";
import { EXAMPLE_MARKDOWN } from "@/lib/markdown/example";

async function main() {
  const db = getDb();
  const email = process.env.SEED_EMAIL ?? "demo@example.com";
  const password = process.env.SEED_PASSWORD ?? "demopassword";

  const passwordHash = await hashSecret(password);
  const [user] = await db
    .insert(users)
    .values({ email, passwordHash, name: "Demo", emailVerifiedAt: new Date() })
    .onConflictDoNothing()
    .returning();

  let userId = user?.id;
  if (!userId) {
    const { eq } = await import("drizzle-orm");
    const existing = await db
      .select()
      .from(users)
      .where(eq(users.email, email))
      .limit(1);
    userId = existing[0]?.id;
  }
  if (!userId) throw new Error("Could not create/find seed user");

  const publicId = createProjectPublicId();
  const [project] = await db
    .insert(projects)
    .values({
      publicId,
      ownerId: userId,
      name: "Demo Project",
      slug: "demo-project",
      description: "Seed project",
    })
    .returning();

  if (project) {
    await db.insert(projectMembers).values({
      projectId: project.id,
      userId,
      role: "owner",
    });

    const managementToken = createManagementToken();
    const checksum = contentChecksum(EXAMPLE_MARKDOWN);
    await db.insert(documents).values({
      publicId: createSharePublicId(),
      managementTokenHash: sha256(managementToken),
      title: "Willkommen",
      description: "Beispieldokument",
      markdownContent: EXAMPLE_MARKDOWN,
      contentChecksum: checksum,
      visibility: "unlisted",
      status: "published",
      projectId: project.id,
      createdBy: userId,
      updatedBy: userId,
      publishedAt: new Date(),
    });

    console.log("Seed complete");
    console.log({ email, password, projectId: project.publicId });
    console.log("Management token for sample doc:", managementToken);
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
