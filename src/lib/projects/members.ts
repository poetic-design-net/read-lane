/**
 * Project members and roles (backend.md §31, v2.md §14 Business).
 *
 * ponytail: members are added by the email of an existing account — there is
 * no mail delivery in this app yet (magic links are only logged), so an
 * invite-token flow would have no way to reach anyone. Add it together with
 * the mailer.
 */

import { and, eq } from "drizzle-orm";
import { getDb } from "@/lib/db";
import { projectMembers, projects, users } from "@/lib/db/schema";
import { assertProjectAccess, ProjectError } from "./service";
import { assertPlanFeature } from "@/lib/plans/service";
import { writeAuditLog } from "@/lib/audit/service";

export type MemberRole = "owner" | "editor" | "viewer";

export interface ProjectMember {
  id: string;
  email: string;
  name: string | null;
  role: MemberRole;
  isOwner: boolean;
  createdAt: Date;
}

export async function listProjectMembers(
  projectPublicId: string,
  userId: string
): Promise<ProjectMember[]> {
  const project = await assertProjectAccess(projectPublicId, userId, "viewer");
  const db = getDb();
  const rows = await db
    .select({
      id: projectMembers.id,
      role: projectMembers.role,
      createdAt: projectMembers.createdAt,
      userId: projectMembers.userId,
      email: users.email,
      name: users.name,
    })
    .from(projectMembers)
    .innerJoin(users, eq(users.id, projectMembers.userId))
    .where(eq(projectMembers.projectId, project.id));

  return rows
    .map((r) => ({
      id: r.id,
      email: r.email,
      name: r.name,
      role: r.role,
      isOwner: r.userId === project.ownerId,
      createdAt: r.createdAt,
    }))
    .sort((a, b) =>
      a.isOwner === b.isOwner
        ? a.email.localeCompare(b.email)
        : a.isOwner
          ? -1
          : 1
    );
}

export async function addProjectMember(
  projectPublicId: string,
  userId: string,
  input: { email: string; role: Exclude<MemberRole, "owner"> }
): Promise<ProjectMember> {
  const project = await assertProjectAccess(projectPublicId, userId, "owner");
  // Entitlement follows the owner's plan, not the acting user's.
  await assertPlanFeature(project.ownerId, "teamMembers");

  const db = getDb();
  const email = input.email.toLowerCase().trim();
  const [invitee] = await db
    .select({ id: users.id, email: users.email, name: users.name })
    .from(users)
    .where(eq(users.email, email))
    .limit(1);

  if (!invitee) {
    throw new ProjectError(
      "Für diese E-Mail gibt es noch kein Konto. Die Person muss sich zuerst registrieren.",
      "NOT_FOUND"
    );
  }
  if (invitee.id === project.ownerId) {
    throw new ProjectError("Eigentümer ist bereits Mitglied", "CONFLICT");
  }

  const [existing] = await db
    .select({ id: projectMembers.id })
    .from(projectMembers)
    .where(
      and(
        eq(projectMembers.projectId, project.id),
        eq(projectMembers.userId, invitee.id)
      )
    )
    .limit(1);
  if (existing) {
    throw new ProjectError("Diese Person ist bereits Mitglied", "CONFLICT");
  }

  const [member] = await db
    .insert(projectMembers)
    .values({
      projectId: project.id,
      userId: invitee.id,
      role: input.role,
    })
    .returning();

  await writeAuditLog({
    action: "project.member_added",
    actorType: "user",
    userId,
    actorId: userId,
    metadata: { projectPublicId, role: input.role },
  });

  return {
    id: member!.id,
    email: invitee.email,
    name: invitee.name,
    role: input.role,
    isOwner: false,
    createdAt: member!.createdAt,
  };
}

export async function updateProjectMemberRole(
  projectPublicId: string,
  userId: string,
  memberId: string,
  role: Exclude<MemberRole, "owner">
) {
  const project = await assertProjectAccess(projectPublicId, userId, "owner");
  const db = getDb();
  const member = await getMember(project.id, memberId);
  if (member.userId === project.ownerId) {
    throw new ProjectError(
      "Die Rolle des Eigentümers kann nicht geändert werden",
      "FORBIDDEN"
    );
  }

  await db
    .update(projectMembers)
    .set({ role })
    .where(eq(projectMembers.id, memberId));

  await writeAuditLog({
    action: "project.member_role_changed",
    actorType: "user",
    userId,
    actorId: userId,
    metadata: { projectPublicId, role },
  });
}

export async function removeProjectMember(
  projectPublicId: string,
  userId: string,
  memberId: string
) {
  const project = await assertProjectAccess(projectPublicId, userId, "owner");
  const db = getDb();
  const member = await getMember(project.id, memberId);
  if (member.userId === project.ownerId) {
    throw new ProjectError(
      "Der Eigentümer kann nicht entfernt werden",
      "FORBIDDEN"
    );
  }

  await db.delete(projectMembers).where(eq(projectMembers.id, memberId));

  await writeAuditLog({
    action: "project.member_removed",
    actorType: "user",
    userId,
    actorId: userId,
    metadata: { projectPublicId },
  });
}

const ROLE_RANK = { viewer: 1, editor: 2, owner: 3 } as const;

export function roleSatisfies(role: MemberRole, minRole: MemberRole): boolean {
  return ROLE_RANK[role] >= ROLE_RANK[minRole];
}

/**
 * Membership check by internal project id, for documents that carry a project
 * but no public project id. Owners always pass.
 */
export async function hasProjectRole(
  projectId: string,
  userId: string,
  minRole: MemberRole = "viewer"
): Promise<boolean> {
  const db = getDb();
  const [row] = await db
    .select({ ownerId: projects.ownerId, role: projectMembers.role })
    .from(projects)
    .leftJoin(
      projectMembers,
      and(
        eq(projectMembers.projectId, projects.id),
        eq(projectMembers.userId, userId)
      )
    )
    .where(eq(projects.id, projectId))
    .limit(1);

  if (!row) return false;
  if (row.ownerId === userId) return true;
  if (!row.role) return false;
  return roleSatisfies(row.role, minRole);
}

/**
 * Documents belong to their creator, and to everyone with the required role in
 * the project they live in.
 */
export async function canAccessDocument(
  doc: { createdBy: string | null; projectId: string | null },
  userId: string,
  minRole: MemberRole = "editor"
): Promise<boolean> {
  if (doc.createdBy === userId) return true;
  if (!doc.projectId) return false;
  return hasProjectRole(doc.projectId, userId, minRole);
}

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Scoped by project so a member id from another project cannot be touched. */
async function getMember(projectId: string, memberId: string) {
  if (!UUID_RE.test(memberId)) {
    throw new ProjectError("Mitglied nicht gefunden", "NOT_FOUND");
  }
  const db = getDb();
  const [member] = await db
    .select()
    .from(projectMembers)
    .where(
      and(
        eq(projectMembers.id, memberId),
        eq(projectMembers.projectId, projectId)
      )
    )
    .limit(1);
  if (!member) throw new ProjectError("Mitglied nicht gefunden", "NOT_FOUND");
  return member;
}
