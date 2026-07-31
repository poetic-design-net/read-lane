/**
 * Upsert platform admin user with Business plan (no Free limits).
 *
 * Usage:
 *   npx tsx scripts/ensure-admin.ts
 *   ADMIN_EMAIL=hallo@frdrk.de ADMIN_PASSWORD='…' npx tsx scripts/ensure-admin.ts
 */
import { config } from "dotenv";
config({ path: ".env.local" });
config({ path: ".env" });

import { eq } from "drizzle-orm";
import { randomBytes } from "crypto";
import { getDb } from "../src/lib/db";
import { users, subscriptions, projects, projectMembers } from "../src/lib/db/schema";
import {
  hashSecret,
  createProjectPublicId,
} from "../src/lib/security/tokens";

async function main() {
  const email = (
    process.env.ADMIN_EMAIL ?? "hallo@frdrk.de"
  ).toLowerCase().trim();
  const password =
    process.env.ADMIN_PASSWORD ??
    `Rl-${randomBytes(9).toString("base64url")}!aA1`;
  const name = process.env.ADMIN_NAME ?? "Frederik";

  const db = getDb();
  const passwordHash = await hashSecret(password);

  const existing = await db
    .select()
    .from(users)
    .where(eq(users.email, email))
    .limit(1);

  let userId: string;

  if (existing[0]) {
    const [updated] = await db
      .update(users)
      .set({
        passwordHash,
        name,
        plan: "business",
        isAdmin: true,
        emailVerifiedAt: new Date(),
        updatedAt: new Date(),
        deletedAt: null,
      })
      .where(eq(users.id, existing[0].id))
      .returning();
    userId = updated!.id;
    console.log("Updated existing user → admin/business");
  } else {
    const [created] = await db
      .insert(users)
      .values({
        email,
        passwordHash,
        name,
        plan: "business",
        isAdmin: true,
        emailVerifiedAt: new Date(),
      })
      .returning();
    userId = created!.id;
    console.log("Created new admin user");
  }

  // Active business subscription row (plan service + UI)
  const subs = await db
    .select()
    .from(subscriptions)
    .where(eq(subscriptions.userId, userId))
    .limit(1);

  const periodEnd = new Date();
  periodEnd.setFullYear(periodEnd.getFullYear() + 10);

  if (subs[0]) {
    await db
      .update(subscriptions)
      .set({
        plan: "business",
        status: "active",
        currentPeriodStart: new Date(),
        currentPeriodEnd: periodEnd,
        cancelAtPeriodEnd: false,
        updatedAt: new Date(),
      })
      .where(eq(subscriptions.id, subs[0].id));
  } else {
    await db.insert(subscriptions).values({
      userId,
      plan: "business",
      status: "active",
      currentPeriodStart: new Date(),
      currentPeriodEnd: periodEnd,
      cancelAtPeriodEnd: false,
    });
  }

  // Seed a default project if none
  const existingProjects = await db
    .select()
    .from(projects)
    .where(eq(projects.ownerId, userId))
    .limit(1);

  if (!existingProjects[0]) {
    const publicId = createProjectPublicId();
    const [project] = await db
      .insert(projects)
      .values({
        publicId,
        ownerId: userId,
        name: "Workspace",
        slug: "workspace",
        description: "Admin default project",
      })
      .returning();
    if (project) {
      await db.insert(projectMembers).values({
        projectId: project.id,
        userId,
        role: "owner",
      });
      console.log("Created default project:", project.publicId);
    }
  }

  console.log("\n=== Admin ready ===");
  console.log("Email:   ", email);
  console.log("Password:", password);
  console.log("Plan:    ", "business");
  console.log("isAdmin: ", true);
  console.log("\nLogin at /login then open /dashboard");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
