"use client";

import { useActionState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Field, FieldLabel, FieldError, FieldGroup } from "@/components/ui/field";
import type { ActionResult } from "@/app/actions/auth";
import { PremiumCard } from "@/components/layout/premium-card";

export function AuthForm({
  title,
  description,
  action,
  submitLabel,
  mode,
  nextPath,
}: {
  title: string;
  description: string;
  action: (prev: ActionResult, formData: FormData) => Promise<ActionResult>;
  submitLabel: string;
  mode: "login" | "register";
  /** Post-auth redirect (relative path) */
  nextPath?: string;
}) {
  const [state, formAction, pending] = useActionState(action, {
    ok: true,
  } as ActionResult);

  return (
    <PremiumCard className="mx-auto max-w-[420px]">
      <div className="mb-6">
        <h1 className="text-[24px] font-semibold tracking-[-0.03em] text-stone-900 dark:text-stone-50">
          {title}
        </h1>
        <p className="mt-1.5 text-[14px] leading-relaxed text-stone-500">
          {description}
        </p>
      </div>

      <form action={formAction}>
        {nextPath ? <input type="hidden" name="next" value={nextPath} /> : null}
        <FieldGroup>
          {mode === "register" && (
            <Field>
              <FieldLabel htmlFor="name">Name (optional)</FieldLabel>
              <Input
                id="name"
                name="name"
                autoComplete="name"
                className="h-10 rounded-xl"
              />
            </Field>
          )}
          <Field>
            <FieldLabel htmlFor="email">E-Mail</FieldLabel>
            <Input
              id="email"
              name="email"
              type="email"
              required
              autoComplete="email"
              className="h-10 rounded-xl"
            />
          </Field>
          <Field>
            <FieldLabel htmlFor="password">Passwort</FieldLabel>
            <Input
              id="password"
              name="password"
              type="password"
              required
              minLength={mode === "register" ? 8 : 1}
              autoComplete={
                mode === "register" ? "new-password" : "current-password"
              }
              className="h-10 rounded-xl"
            />
          </Field>
          {state && state.ok === false && (
            <FieldError>{state.error}</FieldError>
          )}
          <Button
            type="submit"
            disabled={pending}
            className="mt-1 h-10 w-full rounded-full"
          >
            {pending ? "Bitte warten…" : submitLabel}
          </Button>
        </FieldGroup>
      </form>

      <div className="mt-6 flex flex-col gap-2 border-t border-stone-100 pt-5 text-[13px] text-stone-500 dark:border-stone-800">
        {mode === "login" ? (
          <>
            <Link
              href="/register"
              className="font-medium text-stone-700 underline-offset-4 hover:underline dark:text-stone-200"
            >
              Konto erstellen
            </Link>
            <Link
              href="/forgot-password"
              className="underline-offset-4 hover:underline"
            >
              Passwort vergessen
            </Link>
            <Link
              href="/login/magic"
              className="underline-offset-4 hover:underline"
            >
              Mit Magic Link anmelden
            </Link>
          </>
        ) : (
          <Link
            href="/login"
            className="font-medium text-stone-700 underline-offset-4 hover:underline dark:text-stone-200"
          >
            Bereits registriert? Anmelden
          </Link>
        )}
      </div>
    </PremiumCard>
  );
}
