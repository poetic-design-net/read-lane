import { and, count, desc, eq, isNull, sql } from "drizzle-orm";
import { getDb } from "@/lib/db";
import { documents, projectMembers, projects } from "@/lib/db/schema";
import { createProjectPublicId } from "@/lib/security/tokens";
import { slugify } from "@/lib/utils/slug";
import type {
  projectCreateSchema,
  projectUpdateSchema,
} from "@/lib/validation/document";
import type { z } from "zod";
import type { ProjectSummary } from "@/types/document";

export class ProjectError extends Error {
  constructor(
    message: string,
    public code: "NOT_FOUND" | "FORBIDDEN" | "CONFLICT" | "VALIDATION"
  ) {
    super(message);
    this.name = "ProjectError";
  }
}

type CreateInput = z.infer<typeof projectCreateSchema>;
type UpdateInput = z.infer<typeof projectUpdateSchema>;

export async function createProject(ownerId: string, input: CreateInput) {
  const db = getDb();
  const baseSlug = input.slug?.trim() || slugify(input.name);
  let slug = baseSlug;
  let attempt = 0;

  while (attempt < 20) {
    const existing = await db
      .select({ id: projects.id })
      .from(projects)
      .where(and(eq(projects.ownerId, ownerId), eq(projects.slug, slug)))
      .limit(1);
    if (!existing[0]) break;
    attempt += 1;
    slug = `${baseSlug}-${attempt + 1}`;
  }

  const publicId = createProjectPublicId();
  const [project] = await db
    .insert(projects)
    .values({
      publicId,
      ownerId,
      name: input.name.trim(),
      slug,
      description: input.description ?? null,
      defaultVisibility: input.defaultVisibility ?? "unlisted",
      defaultTheme: input.defaultTheme ?? "system",
      defaultContentWidth: input.defaultContentWidth ?? "normal",
      defaultFontStyle: input.defaultFontStyle ?? "sans",
    })
    .returning();

  if (!project) throw new ProjectError("Projekt konnte nicht erstellt werden", "VALIDATION");

  await db.insert(projectMembers).values({
    projectId: project.id,
    userId: ownerId,
    role: "owner",
  });

  return project;
}

export async function getProjectByPublicId(publicId: string) {
  const db = getDb();
  const rows = await db
    .select()
    .from(projects)
    .where(eq(projects.publicId, publicId))
    .limit(1);
  return rows[0] ?? null;
}

export async function assertProjectAccess(
  projectPublicId: string,
  userId: string,
  minRole: "viewer" | "editor" | "owner" = "viewer"
) {
  const project = await getProjectByPublicId(projectPublicId);
  if (!project) throw new ProjectError("Projekt nicht gefunden", "NOT_FOUND");

  if (project.ownerId === userId) return project;

  const db = getDb();
  const members = await db
    .select()
    .from(projectMembers)
    .where(
      and(
        eq(projectMembers.projectId, project.id),
        eq(projectMembers.userId, userId)
      )
    )
    .limit(1);

  const member = members[0];
  if (!member) throw new ProjectError("Kein Zugriff", "FORBIDDEN");

  const rank = { viewer: 1, editor: 2, owner: 3 } as const;
  if (rank[member.role] < rank[minRole]) {
    throw new ProjectError("Keine Berechtigung", "FORBIDDEN");
  }

  return project;
}

export async function listProjectsForUser(
  userId: string,
  options: { includeArchived?: boolean } = {}
): Promise<ProjectSummary[]> {
  const db = getDb();
  const rows = await db
    .select({
      publicId: projects.publicId,
      name: projects.name,
      slug: projects.slug,
      description: projects.description,
      updatedAt: projects.updatedAt,
      archivedAt: projects.archivedAt,
      defaultVisibility: projects.defaultVisibility,
      defaultTheme: projects.defaultTheme,
      defaultContentWidth: projects.defaultContentWidth,
      defaultFontStyle: projects.defaultFontStyle,
      documentCount: sql<number>`(
        SELECT COUNT(*)::int FROM documents
        WHERE documents.project_id = ${projects.id}
        AND documents.deleted_at IS NULL
      )`,
    })
    .from(projects)
    .where(
      and(
        eq(projects.ownerId, userId),
        options.includeArchived ? undefined : isNull(projects.archivedAt)
      )
    )
    .orderBy(desc(projects.updatedAt));

  return rows.map((r) => ({
    ...r,
    documentCount: Number(r.documentCount ?? 0),
  }));
}

export async function updateProject(
  projectPublicId: string,
  userId: string,
  input: UpdateInput
) {
  const project = await assertProjectAccess(projectPublicId, userId, "owner");
  const db = getDb();

  let slug = project.slug;
  if (input.slug && input.slug !== project.slug) {
    const clash = await db
      .select({ id: projects.id })
      .from(projects)
      .where(
        and(
          eq(projects.ownerId, userId),
          eq(projects.slug, input.slug),
          sql`${projects.id} <> ${project.id}`
        )
      )
      .limit(1);
    if (clash[0]) {
      throw new ProjectError("Slug bereits vergeben", "CONFLICT");
    }
    slug = input.slug;
  } else if (input.name && !input.slug) {
    // keep existing slug on rename unless explicit
  }

  const [updated] = await db
    .update(projects)
    .set({
      name: input.name?.trim() ?? project.name,
      slug,
      description:
        input.description !== undefined ? input.description : project.description,
      defaultVisibility: input.defaultVisibility ?? project.defaultVisibility,
      defaultTheme: input.defaultTheme ?? project.defaultTheme,
      defaultContentWidth:
        input.defaultContentWidth ?? project.defaultContentWidth,
      defaultFontStyle: input.defaultFontStyle ?? project.defaultFontStyle,
      archivedAt:
        input.archived === true
          ? new Date()
          : input.archived === false
            ? null
            : project.archivedAt,
      updatedAt: new Date(),
    })
    .where(eq(projects.id, project.id))
    .returning();

  return updated!;
}

export async function deleteProject(projectPublicId: string, userId: string) {
  const project = await assertProjectAccess(projectPublicId, userId, "owner");
  const db = getDb();
  // Soft-archive project + soft-delete documents
  await db
    .update(projects)
    .set({ archivedAt: new Date(), updatedAt: new Date() })
    .where(eq(projects.id, project.id));
  await db
    .update(documents)
    .set({ deletedAt: new Date(), status: "archived", updatedAt: new Date() })
    .where(and(eq(documents.projectId, project.id), isNull(documents.deletedAt)));
}

export async function countDocuments(projectId: string) {
  const db = getDb();
  const rows = await db
    .select({ c: count() })
    .from(documents)
    .where(and(eq(documents.projectId, projectId), isNull(documents.deletedAt)));
  return Number(rows[0]?.c ?? 0);
}
