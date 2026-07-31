"use client";

import { useActionState } from "react";
import Link from "next/link";
import { magicLinkAction, type ActionResult } from "@/app/actions/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Field, FieldLabel, FieldGroup, FieldError } from "@/components/ui/field";
import { PremiumCard } from "@/components/layout/premium-card";

export function MagicLinkForm() {
  const [state, action, pending] = useActionState(magicLinkAction, {
    ok: true,
  } as ActionResult<{ magicUrl?: string | null }>);

  return (
    <PremiumCard className="mx-auto max-w-[420px]">
      <h1 className="text-[24px] font-semibold tracking-[-0.03em] text-stone-900 dark:text-stone-50">
        Magic Link
      </h1>
      <p className="mt-1.5 text-[14px] leading-relaxed text-stone-500">
        Erhalten Sie einen einmaligen Anmeldelink per E-Mail.
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
          {state && state.ok && state.data?.magicUrl && (
            <p className="break-all text-[12px] text-stone-500">
              Dev-Link:{" "}
              <a href={state.data.magicUrl} className="underline">
                {state.data.magicUrl}
              </a>
            </p>
          )}
          <Button
            type="submit"
            disabled={pending}
            className="h-10 w-full rounded-full"
          >
            Link senden
          </Button>
        </FieldGroup>
      </form>
      <Link
        href="/login"
        className="mt-5 inline-block text-[13px] text-stone-500 underline-offset-4 hover:underline"
      >
        Mit Passwort anmelden
      </Link>
    </PremiumCard>
  );
}
