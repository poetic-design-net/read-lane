"use client";

import { useActionState } from "react";
import Link from "next/link";
import { requestResetAction, type ActionResult } from "@/app/actions/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Field, FieldLabel, FieldGroup, FieldError } from "@/components/ui/field";
import { PremiumCard } from "@/components/layout/premium-card";

export function ForgotPasswordForm() {
  const [state, action, pending] = useActionState(requestResetAction, {
    ok: true,
  } as ActionResult<{ resetUrl?: string | null }>);

  return (
    <PremiumCard className="mx-auto max-w-[420px]">
      <h1 className="text-[24px] font-semibold tracking-[-0.03em] text-stone-900 dark:text-stone-50">
        Passwort zurücksetzen
      </h1>
      <p className="mt-1.5 text-[14px] leading-relaxed text-stone-500">
        Wir senden einen Link an Ihre E-Mail-Adresse.
      </p>
      <form action={action} className="mt-6">
        <FieldGroup>
          <Field>
            <FieldLabel htmlFor="email">E-Mail</FieldLabel>
            <Input
              id="email"
              name="email"
              type="email"
              required
              className="h-10 rounded-xl"
            />
          </Field>
          {state && state.ok === false && (
            <FieldError>{state.error}</FieldError>
          )}
          {state && state.ok && state.data?.resetUrl && (
            <p className="break-all text-[12px] text-stone-500">
              Dev-Link: {state.data.resetUrl}
            </p>
          )}
          {state && state.ok && state.data && !state.data.resetUrl && (
            <p className="text-[13px] text-stone-500">
              Falls ein Konto existiert, wurde ein Link vorbereitet.
            </p>
          )}
          <Button
            type="submit"
            disabled={pending}
            className="h-10 w-full rounded-full"
          >
            Link anfordern
          </Button>
        </FieldGroup>
      </form>
      <Link
        href="/login"
        className="mt-5 inline-block text-[13px] text-stone-500 underline-offset-4 hover:underline"
      >
        Zurück zur Anmeldung
      </Link>
    </PremiumCard>
  );
}
