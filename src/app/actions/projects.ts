"use server";

import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/auth/service";
import {
  createProject,
  deleteProject,
  ProjectError,
  updateProject,
} from "@/lib/projects/service";
import {
  projectCreateSchema,
  projectUpdateSchema,
} from "@/lib/validation/document";
import { revokeCliToken } from "@/lib/cli/tokens";
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
    const { assertCanUseProjects, PlanError } = await import(
      "@/lib/plans/service"
    );
    await assertCanUseProjects(user.id);
    const project = await createProject(user.id, parsed.data);
    revalidatePath("/dashboard");
    return { ok: true, data: { publicId: project.publicId } };
  } catch (e) {
    if (e instanceof ProjectError) return { ok: false, error: e.message };
    const { PlanError } = await import("@/lib/plans/service");
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
