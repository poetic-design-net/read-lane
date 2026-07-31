"use client";

import { useState } from "react";
import { Terminal } from "lucide-react";
import { approveDeviceCode, denyDeviceCode } from "@/lib/cli/client-actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Field, FieldLabel, FieldGroup, FieldError } from "@/components/ui/field";
import { PremiumCard } from "@/components/layout/premium-card";

export function CliAuthorizeForm({ initialCode }: { initialCode: string }) {
  const [code, setCode] = useState(initialCode);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState<"approved" | "denied" | null>(null);
  const [loading, setLoading] = useState(false);

  async function approve() {
    setLoading(true);
    setError(null);
    const res = await approveDeviceCode(code);
    setLoading(false);
    if (!res.ok) {
      setError(res.error);
      return;
    }
    setDone("approved");
  }

  async function deny() {
    setLoading(true);
    await denyDeviceCode(code);
    setLoading(false);
    setDone("denied");
  }

  if (done === "approved") {
    return (
      <PremiumCard className="mx-auto max-w-[420px] text-center">
        <div className="mx-auto mb-4 flex size-12 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-600 ring-1 ring-emerald-100 dark:bg-emerald-950/40 dark:ring-emerald-900">
          <Terminal className="size-5" strokeWidth={1.75} />
        </div>
        <h1 className="text-[22px] font-semibold tracking-tight">
          CLI verbunden
        </h1>
        <p className="mt-2 text-[14px] text-stone-500">
          Sie können dieses Fenster schließen und im Terminal fortfahren.
        </p>
      </PremiumCard>
    );
  }

  if (done === "denied") {
    return (
      <PremiumCard className="mx-auto max-w-[420px] text-center">
        <h1 className="text-[22px] font-semibold tracking-tight">Abgelehnt</h1>
        <p className="mt-2 text-[14px] text-stone-500">
          Der CLI-Zugang wurde nicht erteilt.
        </p>
      </PremiumCard>
    );
  }

  return (
    <PremiumCard className="mx-auto max-w-[420px]">
      <div className="mb-4 flex size-11 items-center justify-center rounded-2xl bg-stone-50 ring-1 ring-stone-100 dark:bg-stone-800 dark:ring-stone-700">
        <Terminal className="size-4 text-stone-500" strokeWidth={1.75} />
      </div>
      <h1 className="text-[22px] font-semibold tracking-[-0.03em] text-stone-900 dark:text-stone-50">
        CLI-Zugang bestätigen
      </h1>
      <p className="mt-1.5 text-[14px] leading-relaxed text-stone-500">
        Ein Terminal möchte Zugriff auf Ihr Konto. Prüfen Sie den Code.
      </p>
      <div className="mt-6">
        <FieldGroup>
          <Field>
            <FieldLabel htmlFor="user-code">Gerätecode</FieldLabel>
            <Input
              id="user-code"
              value={code}
              onChange={(e) => setCode(e.target.value.toUpperCase())}
              placeholder="ABCD-EFGH"
              className="h-11 rounded-xl font-mono tracking-[0.2em]"
            />
          </Field>
          {error && <FieldError>{error}</FieldError>}
          <div className="flex gap-2 pt-1">
            <Button
              disabled={loading || !code}
              onClick={() => void approve()}
              className="h-10 flex-1 rounded-full"
            >
              Zugang erlauben
            </Button>
            <Button
              variant="outline"
              disabled={loading || !code}
              onClick={() => void deny()}
              className="h-10 rounded-full"
            >
              Ablehnen
            </Button>
          </div>
        </FieldGroup>
      </div>
    </PremiumCard>
  );
}
