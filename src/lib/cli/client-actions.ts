"use server";

import { requireUser } from "@/lib/auth/service";
import {
  approveDeviceCode as approve,
  denyDeviceCode as deny,
  CliAuthError,
} from "@/lib/cli/tokens";

export async function approveDeviceCode(userCode: string) {
  try {
    await requireUser().then((u) => approve(userCode, u.id));
    return { ok: true as const };
  } catch (e) {
    if (e instanceof CliAuthError) return { ok: false as const, error: e.message };
    return { ok: false as const, error: "Bestätigung fehlgeschlagen" };
  }
}

export async function denyDeviceCode(userCode: string) {
  try {
    await requireUser();
    await deny(userCode);
    return { ok: true as const };
  } catch {
    return { ok: false as const, error: "Ablehnung fehlgeschlagen" };
  }
}
