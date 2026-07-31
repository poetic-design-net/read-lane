"use server";

import { redirect } from "next/navigation";
import {
  AuthError,
  changeEmail,
  deleteAccount,
  loginUser,
  logoutUser,
  registerUser,
  requestMagicLink,
  requestPasswordReset,
  resetPassword,
} from "@/lib/auth/service";
import {
  authLoginSchema,
  authRegisterSchema,
} from "@/lib/validation/document";
import { checkRateLimit } from "@/lib/security/rate-limit";
import { getClientIp } from "@/lib/security/client-ip";
import { appConfig } from "@/lib/config";
import { requireUser } from "@/lib/auth/service";

export type ActionResult<T = void> =
  | { ok: true; data?: T }
  | { ok: false; error: string };

/** Only allow same-origin relative paths after login/register. */
function safeNextPath(raw: FormDataEntryValue | null): string {
  const v = String(raw ?? "").trim();
  if (!v.startsWith("/") || v.startsWith("//")) return "/dashboard";
  if (v.startsWith("/login") || v.startsWith("/register")) return "/dashboard";
  return v;
}

export async function registerAction(
  _prev: ActionResult,
  formData: FormData
): Promise<ActionResult> {
  const ip = await getClientIp();
  const rl = checkRateLimit(
    `auth:register:${ip}`,
    appConfig.rateLimit.auth.windowMs,
    appConfig.rateLimit.auth.max
  );
  if (!rl.success) return { ok: false, error: "Zu viele Versuche. Bitte warten." };

  const parsed = authRegisterSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
    name: formData.get("name") || undefined,
  });
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Ungültige Eingabe" };
  }

  try {
    await registerUser(parsed.data);
  } catch (e) {
    if (e instanceof AuthError) return { ok: false, error: e.message };
    return { ok: false, error: "Registrierung fehlgeschlagen" };
  }
  redirect(safeNextPath(formData.get("next")));
}

export async function loginAction(
  _prev: ActionResult,
  formData: FormData
): Promise<ActionResult> {
  const ip = await getClientIp();
  const rl = checkRateLimit(
    `auth:login:${ip}`,
    appConfig.rateLimit.auth.windowMs,
    appConfig.rateLimit.auth.max
  );
  if (!rl.success) return { ok: false, error: "Zu viele Versuche. Bitte warten." };

  const parsed = authLoginSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
  });
  if (!parsed.success) {
    return { ok: false, error: "Ungültige Eingabe" };
  }

  try {
    await loginUser(parsed.data);
  } catch (e) {
    if (e instanceof AuthError) return { ok: false, error: e.message };
    return { ok: false, error: "Anmeldung fehlgeschlagen" };
  }
  redirect(safeNextPath(formData.get("next")));
}

export async function logoutAction() {
  await logoutUser();
  redirect("/");
}

export async function requestResetAction(
  _prev: ActionResult<{ resetUrl?: string | null }>,
  formData: FormData
): Promise<ActionResult<{ resetUrl?: string | null }>> {
  const email = String(formData.get("email") ?? "");
  try {
    const result = await requestPasswordReset(email);
    return {
      ok: true,
      data: { resetUrl: result.resetUrl },
    };
  } catch {
    return { ok: false, error: "Anfrage fehlgeschlagen" };
  }
}

export async function resetPasswordAction(
  _prev: ActionResult,
  formData: FormData
): Promise<ActionResult> {
  const token = String(formData.get("token") ?? "");
  const password = String(formData.get("password") ?? "");
  if (password.length < 8) {
    return { ok: false, error: "Passwort muss mindestens 8 Zeichen haben" };
  }
  try {
    await resetPassword(token, password);
    return { ok: true };
  } catch (e) {
    if (e instanceof AuthError) return { ok: false, error: e.message };
    return { ok: false, error: "Zurücksetzen fehlgeschlagen" };
  }
}

export async function magicLinkAction(
  _prev: ActionResult<{ magicUrl?: string | null }>,
  formData: FormData
): Promise<ActionResult<{ magicUrl?: string | null }>> {
  const email = String(formData.get("email") ?? "");
  try {
    const result = await requestMagicLink(email);
    return { ok: true, data: { magicUrl: result.magicUrl } };
  } catch {
    return { ok: false, error: "Anfrage fehlgeschlagen" };
  }
}

export async function changeEmailAction(
  _prev: ActionResult,
  formData: FormData
): Promise<ActionResult> {
  try {
    const user = await requireUser();
    await changeEmail(
      user.id,
      String(formData.get("email") ?? ""),
      String(formData.get("password") ?? "")
    );
    return { ok: true };
  } catch (e) {
    if (e instanceof AuthError) return { ok: false, error: e.message };
    return { ok: false, error: "Änderung fehlgeschlagen" };
  }
}

export async function deleteAccountAction(
  _prev: ActionResult,
  formData: FormData
): Promise<ActionResult> {
  try {
    const user = await requireUser();
    await deleteAccount(user.id, String(formData.get("password") ?? ""));
  } catch (e) {
    if (e instanceof AuthError) return { ok: false, error: e.message };
    return { ok: false, error: "Löschen fehlgeschlagen" };
  }
  redirect("/");
}
