"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireUser } from "@/lib/auth/service";
import {
  addDomain,
  DomainError,
  removeDomain,
  updateDomainBranding,
  verifyDomain,
} from "@/lib/domains/service";
import { PlanError } from "@/lib/plans/service";
import { ProjectError } from "@/lib/projects/service";
import type { ActionResult } from "./auth";

const addSchema = z.object({
  host: z.string().min(3).max(253),
  projectPublicId: z.string().optional().nullable(),
});

const brandingSchema = z.object({
  brandName: z.string().trim().max(60).optional().nullable(),
  // Hex only — this value ends up in a style attribute.
  brandColor: z
    .string()
    .regex(/^#[0-9a-fA-F]{6}$/, "Farbe muss ein Hex-Wert sein")
    .optional()
    .nullable()
    .or(z.literal("")),
  brandLogoUrl: z
    .string()
    .url()
    .startsWith("https://", "Nur https erlaubt")
    .optional()
    .nullable()
    .or(z.literal("")),
});

export async function addDomainAction(
  input: unknown
): Promise<ActionResult<{ publicId: string; verificationToken: string }>> {
  const user = await requireUser();
  const parsed = addSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Ungültig" };
  }
  try {
    const domain = await addDomain(user.id, {
      host: parsed.data.host,
      projectPublicId: parsed.data.projectPublicId,
    });
    revalidatePath("/dashboard/settings");
    return {
      ok: true,
      data: {
        publicId: domain.publicId,
        verificationToken: domain.verificationToken,
      },
    };
  } catch (e) {
    return { ok: false, error: domainErrorMessage(e) };
  }
}

export async function verifyDomainAction(
  publicId: string
): Promise<ActionResult> {
  const user = await requireUser();
  try {
    await verifyDomain(user.id, publicId);
    revalidatePath("/dashboard/settings");
    return { ok: true };
  } catch (e) {
    return { ok: false, error: domainErrorMessage(e) };
  }
}

export async function updateDomainBrandingAction(
  publicId: string,
  input: unknown
): Promise<ActionResult> {
  const user = await requireUser();
  const parsed = brandingSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Ungültig" };
  }
  try {
    await updateDomainBranding(user.id, publicId, {
      brandName: parsed.data.brandName || null,
      brandColor: parsed.data.brandColor || null,
      brandLogoUrl: parsed.data.brandLogoUrl || null,
    });
    revalidatePath("/dashboard/settings");
    return { ok: true };
  } catch (e) {
    return { ok: false, error: domainErrorMessage(e) };
  }
}

export async function removeDomainAction(
  publicId: string
): Promise<ActionResult> {
  const user = await requireUser();
  try {
    await removeDomain(user.id, publicId);
    revalidatePath("/dashboard/settings");
    return { ok: true };
  } catch (e) {
    return { ok: false, error: domainErrorMessage(e) };
  }
}

function domainErrorMessage(e: unknown): string {
  if (
    e instanceof DomainError ||
    e instanceof PlanError ||
    e instanceof ProjectError
  ) {
    return e.message;
  }
  return "Aktion fehlgeschlagen";
}
