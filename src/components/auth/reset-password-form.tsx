"use client";

import { useActionState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { resetPasswordAction, type ActionResult } from "@/app/actions/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Field, FieldLabel, FieldGroup, FieldError } from "@/components/ui/field";
import { PremiumCard } from "@/components/layout/premium-card";

export function ResetPasswordForm() {
  const searchParams = useSearchParams();
  const token = searchParams.get("token") ?? "";
  const [state, action, pending] = useActionState(resetPasswordAction, {
    ok: true,
  } as ActionResult);

  return (
    <PremiumCard className="mx-auto max-w-[420px]">
      <h1 className="text-[24px] font-semibold tracking-[-0.03em] text-stone-900 dark:text-stone-50">
        Neues Passwort
      </h1>
      <p className="mt-1.5 text-[14px] leading-relaxed text-stone-500">
        Wählen Sie ein sicheres Passwort mit mindestens 8 Zeichen.
      </p>
      <form action={action} className="mt-6">
        <input type="hidden" name="token" value={token} />
        <FieldGroup>
          <Field>
            <FieldLabel htmlFor="password">Neues Passwort</FieldLabel>
            <Input
              id="password"
              name="password"
              type="password"
              required
              minLength={8}
              autoComplete="new-password"
              className="h-10 rounded-xl"
            />
          </Field>
          {state && state.ok === false && (
            <FieldError>{state.error}</FieldError>
          )}
          {state && state.ok === true && (
            <p className="text-[13px] text-stone-500">
              Passwort aktualisiert.{" "}
              <Link href="/login" className="font-medium underline">
                Anmelden
              </Link>
            </p>
          )}
          <Button
            type="submit"
            disabled={pending || !token}
            className="h-10 w-full rounded-full"
          >
            Speichern
          </Button>
        </FieldGroup>
      </form>
    </PremiumCard>
  );
}
