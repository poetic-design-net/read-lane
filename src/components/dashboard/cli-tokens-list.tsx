"use client";

import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { revokeCliTokenAction } from "@/app/actions/projects";
import { format } from "date-fns";
import { de } from "date-fns/locale";

interface TokenRow {
  publicId: string;
  name: string;
  deviceName: string | null;
  operatingSystem: string | null;
  lastUsedAt: string | null;
  expiresAt: string | null;
  createdAt: string;
  scope: string;
}

export function CliTokensList({ tokens }: { tokens: TokenRow[] }) {
  const router = useRouter();

  async function revoke(id: string) {
    if (!confirm("CLI-Zugang widerrufen?")) return;
    const res = await revokeCliTokenAction(id);
    if (!res.ok) {
      toast.error(res.error);
      return;
    }
    toast.success("Zugang widerrufen");
    router.refresh();
  }

  if (tokens.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">Keine aktiven CLI-Zugänge.</p>
    );
  }

  return (
    <ul className="flex flex-col gap-2">
      {tokens.map((t) => (
        <li
          key={t.publicId}
          className="flex flex-col gap-2 rounded-lg border border-border px-3 py-3 sm:flex-row sm:items-center sm:justify-between"
        >
          <div>
            <p className="text-sm font-medium">
              {t.deviceName ?? t.name}
              {t.operatingSystem ? ` · ${t.operatingSystem}` : ""}
            </p>
            <p className="text-xs text-muted-foreground">
              Erstellt{" "}
              {format(new Date(t.createdAt), "dd.MM.yyyy", { locale: de })}
              {t.lastUsedAt
                ? ` · zuletzt ${format(new Date(t.lastUsedAt), "dd.MM.yyyy HH:mm", { locale: de })}`
                : ""}
              {t.expiresAt
                ? ` · läuft ab ${format(new Date(t.expiresAt), "dd.MM.yyyy", { locale: de })}`
                : ""}
            </p>
          </div>
          <Button
            size="sm"
            variant="destructive"
            onClick={() => void revoke(t.publicId)}
          >
            Widerrufen
          </Button>
        </li>
      ))}
    </ul>
  );
}
