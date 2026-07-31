"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Lock } from "lucide-react";
import { unlockDocumentAction } from "@/app/actions/documents";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Field, FieldLabel, FieldError } from "@/components/ui/field";

export function PasswordForm({
  publicId,
  title,
}: {
  publicId: string;
  title?: string;
}) {
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const res = await unlockDocumentAction({ publicId, password });
    setLoading(false);
    if (!res.ok) {
      setError(res.error);
      setPassword("");
      return;
    }
    router.refresh();
  }

  return (
    <div className="w-full max-w-[400px] rounded-[22px] border border-white/80 bg-white/95 p-7 shadow-[0_1px_1px_rgba(15,15,15,0.03),0_24px_56px_-18px_rgba(15,15,15,0.16)] ring-1 ring-black/[0.03] backdrop-blur-sm dark:border-white/10 dark:bg-stone-900/95">
      <div className="mb-5 flex size-11 items-center justify-center rounded-2xl bg-stone-50 ring-1 ring-stone-100 dark:bg-stone-800 dark:ring-stone-700">
        <Lock className="size-4 text-stone-500" strokeWidth={1.75} />
      </div>
      <h1 className="text-[22px] font-semibold tracking-[-0.03em] text-stone-900 dark:text-stone-50">
        Passwort erforderlich
      </h1>
      <p className="mt-1.5 text-[14px] leading-relaxed text-stone-500">
        {title
          ? `„${title}“ ist passwortgeschützt.`
          : "Dieses Dokument ist passwortgeschützt."}
      </p>

      <form onSubmit={onSubmit} className="mt-6 flex flex-col gap-4">
        <Field data-invalid={error ? true : undefined}>
          <FieldLabel htmlFor="doc-password">Passwort</FieldLabel>
          <Input
            id="doc-password"
            type="password"
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            aria-invalid={error ? true : undefined}
            required
            className="h-10 rounded-xl"
            autoFocus
          />
          {error && <FieldError>{error}</FieldError>}
        </Field>
        <Button
          type="submit"
          disabled={loading || !password}
          className="h-10 w-full rounded-full"
        >
          {loading ? "Prüfen…" : "Dokument öffnen"}
        </Button>
      </form>
    </div>
  );
}
