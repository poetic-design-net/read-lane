"use server";

import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/auth/service";
import {
  createProject,
  deleteProject,
  ProjectError,
  updateProject,
} from "@/lib/projects/service";
import { assertProjectAccess } from "@/lib/projects/service";
import { writeAuditLog } from "@/lib/audit/service";
import {
  addProjectMember,
  removeProjectMember,
  updateProjectMemberRole,
  type ProjectMember,
} from "@/lib/projects/members";
import {
  assertCanUseProjects,
  assertPlanFeature,
  PlanError,
} from "@/lib/plans/service";
import {
  addMemberSchema,
  apiTokenCreateSchema,
  memberRoleSchema,
  projectCreateSchema,
  projectUpdateSchema,
} from "@/lib/validation/document";
import { createApiToken, revokeCliToken } from "@/lib/cli/tokens";
import type { ActionResult } from "./auth";

export async function createProjectAction(
  input: unknown
): Promise<ActionResult<{ publicId: string }>> {
  const user = await requireUser();
  const parsed = projectCreateSchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      error: parsed.error.issues[0]?.message ?? "Ungültige Eingabe",
    };
  }
  try {
    await assertCanUseProjects(user.id);
    const project = await createProject(user.id, parsed.data);
    revalidatePath("/dashboard");
    return { ok: true, data: { publicId: project.publicId } };
  } catch (e) {
    if (e instanceof ProjectError) return { ok: false, error: e.message };
    if (e instanceof PlanError) return { ok: false, error: e.message };
    return { ok: false, error: "Projekt konnte nicht erstellt werden" };
  }
}

export async function updateProjectAction(
  publicId: string,
  input: unknown
): Promise<ActionResult> {
  const user = await requireUser();
  const parsed = projectUpdateSchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      error: parsed.error.issues[0]?.message ?? "Ungültige Eingabe",
    };
  }
  try {
    await updateProject(publicId, user.id, parsed.data);
    revalidatePath("/dashboard");
    revalidatePath(`/dashboard/projects/${publicId}`);
    return { ok: true };
  } catch (e) {
    if (e instanceof ProjectError) return { ok: false, error: e.message };
    return { ok: false, error: "Speichern fehlgeschlagen" };
  }
}

export async function deleteProjectAction(
  publicId: string
): Promise<ActionResult> {
  const user = await requireUser();
  try {
    await deleteProject(publicId, user.id);
    revalidatePath("/dashboard");
    return { ok: true };
  } catch (e) {
    if (e instanceof ProjectError) return { ok: false, error: e.message };
    return { ok: false, error: "Löschen fehlgeschlagen" };
  }
}

export async function addProjectMemberAction(
  projectPublicId: string,
  input: unknown
): Promise<ActionResult<{ member: ProjectMember }>> {
  const user = await requireUser();
  const parsed = addMemberSchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      error: parsed.error.issues[0]?.message ?? "Ungültige Eingabe",
    };
  }
  try {
    const member = await addProjectMember(projectPublicId, user.id, parsed.data);
    revalidatePath(`/dashboard/projects/${projectPublicId}`);
    return { ok: true, data: { member } };
  } catch (e) {
    return { ok: false, error: memberErrorMessage(e, "Hinzufügen") };
  }
}

export async function updateProjectMemberRoleAction(
  projectPublicId: string,
  memberId: string,
  role: unknown
): Promise<ActionResult> {
  const user = await requireUser();
  const parsed = memberRoleSchema.safeParse(role);
  if (!parsed.success) return { ok: false, error: "Ungültige Rolle" };
  try {
    await updateProjectMemberRole(
      projectPublicId,
      user.id,
      memberId,
      parsed.data
    );
    revalidatePath(`/dashboard/projects/${projectPublicId}`);
    return { ok: true };
  } catch (e) {
    return { ok: false, error: memberErrorMessage(e, "Ändern") };
  }
}

export async function removeProjectMemberAction(
  projectPublicId: string,
  memberId: string
): Promise<ActionResult> {
  const user = await requireUser();
  try {
    await removeProjectMember(projectPublicId, user.id, memberId);
    revalidatePath(`/dashboard/projects/${projectPublicId}`);
    return { ok: true };
  } catch (e) {
    return { ok: false, error: memberErrorMessage(e, "Entfernen") };
  }
}

function memberErrorMessage(e: unknown, verb: string): string {
  if (e instanceof ProjectError) return e.message;
  if (e instanceof PlanError) return e.message;
  return `${verb} fehlgeschlagen`;
}

/**
 * Business feature: long-lived tokens for CI and API clients. Project-scoped
 * tokens are restricted to that project server-side.
 */
export async function createApiTokenAction(
  input: unknown
): Promise<ActionResult<{ token: string; publicId: string }>> {
  const user = await requireUser();
  const parsed = apiTokenCreateSchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      error: parsed.error.issues[0]?.message ?? "Ungültige Eingabe",
    };
  }

  try {
    await assertPlanFeature(user.id, "apiAccess");

    let projectId: string | null = null;
    if (parsed.data.projectId) {
      const project = await assertProjectAccess(
        parsed.data.projectId,
        user.id,
        "owner"
      );
      projectId = project.id;
    }
    if (!projectId && parsed.data.scope !== "full") {
      return { ok: false, error: "Für diesen Scope ist ein Projekt nötig" };
    }

    const created = await createApiToken({
      userId: user.id,
      name: parsed.data.name,
      projectId,
      scope: parsed.data.scope,
      expiresInDays: parsed.data.expiresInDays ?? null,
    });

    await writeAuditLog({
      action: "api_token.created",
      actorType: "user",
      userId: user.id,
      actorId: user.id,
      metadata: { scope: parsed.data.scope, hasProject: Boolean(projectId) },
    });

    revalidatePath("/dashboard/settings");
    return { ok: true, data: created };
  } catch (e) {
    if (e instanceof PlanError) return { ok: false, error: e.message };
    if (e instanceof ProjectError) return { ok: false, error: e.message };
    return { ok: false, error: "Token konnte nicht erstellt werden" };
  }
}

export async function revokeCliTokenAction(
  tokenPublicId: string
): Promise<ActionResult> {
  const user = await requireUser();
  try {
    await revokeCliToken(user.id, tokenPublicId);
    revalidatePath("/dashboard/settings");
    return { ok: true };
  } catch {
    return { ok: false, error: "Widerruf fehlgeschlagen" };
  }
}
