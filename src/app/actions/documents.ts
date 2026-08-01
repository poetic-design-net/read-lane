"use server";

import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/auth/service";
import {
  createDocument,
  DocumentError,
  getDocumentByManagementToken,
  getDocumentByPublicId,
  regeneratePublicId,
  softDeleteDocument,
  updateDocumentById,
  verifyManagementToken,
  listVersions,
  restoreVersion,
} from "@/lib/documents/service";
import {
  attachFileToDocument,
  getOwnedFileByPublicId,
} from "@/lib/files/service";
import { createSignedManagementToken } from "@/lib/security/auth-session";
import { hashPassword, verifyPassword } from "@/lib/security/passwords";
import {
  DUMMY_PASSWORD_HASH,
  verifySecret,
} from "@/lib/security/tokens";
import { setUnlockSession } from "@/lib/security/session";
import { checkRateLimit } from "@/lib/security/rate-limit";
import { getClientIp } from "@/lib/security/client-ip";
import { appConfig } from "@/lib/config";
import {
  publishDocumentSchema,
  unlockDocumentSchema,
  updateDocumentSchema,
} from "@/lib/validation/document";
import { manageUrl, shareUrl } from "@/lib/utils/urls";
import { assertProjectAccess } from "@/lib/projects/service";
import type { ActionResult } from "./auth";

export async function publishDocumentAction(
  input: unknown
): Promise<
  ActionResult<{
    publicId: string;
    shareUrl: string;
    manageUrl: string;
    managementToken: string;
  }>
> {
  const ip = await getClientIp();
  const rl = checkRateLimit(
    `publish:${ip}`,
    appConfig.rateLimit.publish.windowMs,
    appConfig.rateLimit.publish.max
  );
  if (!rl.success) {
    return { ok: false, error: "Rate Limit erreicht. Bitte später erneut versuchen." };
  }

  const parsed = publishDocumentSchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      error: parsed.error.issues[0]?.message ?? "Ungültige Eingabe",
    };
  }

  // Account required — no anonymous publish
  let user;
  try {
    user = await requireUser();
  } catch {
    return { ok: false, error: "Anmeldung erforderlich" };
  }

  if (parsed.data.projectId) {
    try {
      const project = await assertProjectAccess(
        parsed.data.projectId,
        user.id,
        "editor"
      );
      parsed.data.projectId = project.id;
    } catch {
      return { ok: false, error: "Kein Zugriff auf dieses Projekt" };
    }
  }

  // Uploaded file: resolve ownership server-side. The storage key is never
  // taken from the request.
  let file = null;
  if (parsed.data.fileId) {
    file = await getOwnedFileByPublicId(parsed.data.fileId, user.id);
    if (!file) {
      return { ok: false, error: "Datei nicht gefunden" };
    }
  }

  try {
    const result = await createDocument(parsed.data, {
      userId: user.id,
      source: "web",
      replaceActive: Boolean(parsed.data.replaceActive),
      mimeType: file?.mimeType ?? null,
      fileSize: file?.fileSize ?? null,
      originalFileKey: file?.storageKey ?? null,
    });
    if (file) {
      await attachFileToDocument(file.publicId, result.document.publicId);
    }
    revalidatePath("/dashboard");
    revalidatePath(`/d/${result.document.publicId}`);
    if (parsed.data.projectId) {
      revalidatePath("/dashboard/projects");
    }
    return {
      ok: true,
      data: {
        publicId: result.document.publicId,
        shareUrl: result.shareUrl,
        manageUrl: result.manageUrl,
        managementToken: result.managementToken,
      },
    };
  } catch (e) {
    if (e instanceof DocumentError) {
      return { ok: false, error: e.message };
    }
    return { ok: false, error: "Veröffentlichung fehlgeschlagen" };
  }
}

export async function unlockDocumentAction(
  input: unknown
): Promise<ActionResult> {
  const ip = await getClientIp();
  const rl = checkRateLimit(
    `password:${ip}`,
    appConfig.rateLimit.password.windowMs,
    appConfig.rateLimit.password.max
  );
  if (!rl.success) {
    return { ok: false, error: "Zu viele Versuche. Bitte später erneut versuchen." };
  }

  const parsed = unlockDocumentSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: "Ungültige Eingabe" };
  }

  const doc = await getDocumentByPublicId(parsed.data.publicId);
  // Always run a hash compare to reduce timing leaks
  const hash = doc?.passwordHash ?? DUMMY_PASSWORD_HASH;
  const ok = await verifyPassword(parsed.data.password, hash);

  if (!doc || !ok) {
    return { ok: false, error: "Passwort ungültig oder Dokument nicht gefunden" };
  }

  await setUnlockSession(doc.publicId);
  return { ok: true };
}

export async function updateManagedDocumentAction(
  token: string,
  input: unknown
): Promise<ActionResult> {
  const ip = await getClientIp();
  const rl = checkRateLimit(
    `manage:${ip}`,
    appConfig.rateLimit.manage.windowMs,
    appConfig.rateLimit.manage.max
  );
  if (!rl.success) {
    return { ok: false, error: "Rate Limit erreicht" };
  }

  const parsed = updateDocumentSchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      error: parsed.error.issues[0]?.message ?? "Ungültige Eingabe",
    };
  }

  try {
    const doc = await getDocumentByManagementToken(token);
    await updateDocumentById(doc, parsed.data, { source: "web" });
    revalidatePath(`/d/${doc.publicId}`);
    return { ok: true };
  } catch (e) {
    if (e instanceof DocumentError) return { ok: false, error: e.message };
    return { ok: false, error: "Speichern fehlgeschlagen" };
  }
}

export async function deleteManagedDocumentAction(
  token: string
): Promise<ActionResult> {
  try {
    const doc = await getDocumentByManagementToken(token);
    await softDeleteDocument(doc);
    return { ok: true };
  } catch (e) {
    if (e instanceof DocumentError) return { ok: false, error: e.message };
    return { ok: false, error: "Löschen fehlgeschlagen" };
  }
}

export async function regenerateShareLinkAction(
  token: string
): Promise<ActionResult<{ shareUrl: string; publicId: string }>> {
  try {
    const doc = await getDocumentByManagementToken(token);
    const updated = await regeneratePublicId(doc);
    return {
      ok: true,
      data: {
        publicId: updated.publicId,
        shareUrl: shareUrl(updated.publicId),
      },
    };
  } catch (e) {
    if (e instanceof DocumentError) return { ok: false, error: e.message };
    return { ok: false, error: "Fehlgeschlagen" };
  }
}

export async function updateDashboardDocumentAction(
  publicId: string,
  input: unknown
): Promise<ActionResult> {
  const user = await requireUser();
  const parsed = updateDocumentSchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      error: parsed.error.issues[0]?.message ?? "Ungültige Eingabe",
    };
  }

  const doc = await getDocumentByPublicId(publicId);
  if (!doc || doc.createdBy !== user.id) {
    // Also allow project owners
    if (!doc) return { ok: false, error: "Nicht gefunden" };
    // ownership check via project later — for MVP creator only
    if (doc.createdBy !== user.id) {
      return { ok: false, error: "Kein Zugriff" };
    }
  }

  try {
    await updateDocumentById(doc!, parsed.data, {
      userId: user.id,
      source: "web",
    });
    revalidatePath(`/d/${publicId}`);
    revalidatePath("/dashboard");
    return { ok: true };
  } catch (e) {
    if (e instanceof DocumentError) return { ok: false, error: e.message };
    return { ok: false, error: "Speichern fehlgeschlagen" };
  }
}

export async function createManagementUrlAction(
  publicId: string
): Promise<ActionResult<{ manageUrl: string }>> {
  const user = await requireUser();
  const doc = await getDocumentByPublicId(publicId);
  if (!doc || (doc.createdBy !== user.id && !doc.projectId)) {
    return { ok: false, error: "Kein Zugriff" };
  }
  // Verify ownership
  if (doc.createdBy !== user.id) {
    return { ok: false, error: "Kein Zugriff" };
  }
  const token = await createSignedManagementToken(publicId, user.id);
  return {
    ok: true,
    data: { manageUrl: `${appConfig.url}/manage/s/${token}` },
  };
}

export async function getDocumentVersionsAction(publicId: string) {
  const user = await requireUser();
  const doc = await getDocumentByPublicId(publicId);
  if (!doc || doc.createdBy !== user.id) {
    return { ok: false as const, error: "Kein Zugriff" };
  }
  const versions = await listVersions(doc.id);
  return { ok: true as const, data: versions };
}

export async function restoreDocumentVersionAction(
  publicId: string,
  version: number
): Promise<ActionResult> {
  const user = await requireUser();
  const doc = await getDocumentByPublicId(publicId);
  if (!doc || doc.createdBy !== user.id) {
    return { ok: false, error: "Kein Zugriff" };
  }
  try {
    await restoreVersion(doc, version, user.id);
    revalidatePath(`/d/${publicId}`);
    return { ok: true };
  } catch (e) {
    if (e instanceof DocumentError) return { ok: false, error: e.message };
    return { ok: false, error: "Wiederherstellung fehlgeschlagen" };
  }
}

// silence unused import warnings in edge cases
void hashPassword;
void verifySecret;
void verifyManagementToken;
void manageUrl;
