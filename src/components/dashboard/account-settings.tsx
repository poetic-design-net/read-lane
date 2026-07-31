"use client";

import { useActionState } from "react";
import {
  changeEmailAction,
  deleteAccountAction,
  type ActionResult,
} from "@/app/actions/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Field, FieldLabel, FieldGroup, FieldError } from "@/components/ui/field";

export function AccountSettings({ email }: { email: string }) {
  const [emailState, emailAction, emailPending] = useActionState(
    changeEmailAction,
    { ok: true } as ActionResult
  );
  const [delState, delAction, delPending] = useActionState(deleteAccountAction, {
    ok: true,
  } as ActionResult);

  return (
    <div className="flex flex-col gap-10">
      <section className="rounded-xl border border-border p-4">
        <h2 className="mb-4 text-lg font-medium">E-Mail ändern</h2>
        <p className="mb-4 text-sm text-muted-foreground">Aktuell: {email}</p>
        <form action={emailAction}>
          <FieldGroup>
            <Field>
              <FieldLabel htmlFor="new-email">Neue E-Mail</FieldLabel>
              <Input id="new-email" name="email" type="email" required />
            </Field>
            <Field>
              <FieldLabel htmlFor="pw-email">Aktuelles Passwort</FieldLabel>
              <Input
                id="pw-email"
                name="password"
                type="password"
                required
                autoComplete="current-password"
              />
            </Field>
            {emailState && emailState.ok === false && (
              <FieldError>{emailState.error}</FieldError>
            )}
            {emailState && emailState.ok && (
              <p className="text-sm text-muted-foreground">Gespeichert.</p>
            )}
            <Button type="submit" disabled={emailPending}>
              E-Mail speichern
            </Button>
          </FieldGroup>
        </form>
      </section>

      <section className="rounded-xl border border-destructive/30 p-4">
        <h2 className="mb-2 text-lg font-medium text-destructive">
          Konto löschen
        </h2>
        <p className="mb-4 text-sm text-muted-foreground">
          Unwiderruflich. Projekte und Dokumente bleiben ggf. soft-gelöscht.
        </p>
        <form action={delAction}>
          <FieldGroup>
            <Field>
              <FieldLabel htmlFor="pw-del">Passwort bestätigen</FieldLabel>
              <Input
                id="pw-del"
                name="password"
                type="password"
                required
                autoComplete="current-password"
              />
            </Field>
            {delState && delState.ok === false && (
              <FieldError>{delState.error}</FieldError>
            )}
            <Button type="submit" variant="destructive" disabled={delPending}>
              Konto löschen
            </Button>
          </FieldGroup>
        </form>
      </section>
    </div>
  );
}
