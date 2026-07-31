"use client";

import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { restoreDocumentVersionAction } from "@/app/actions/documents";
import { format } from "date-fns";
import { de } from "date-fns/locale";

interface VersionRow {
  version: number;
  contentChecksum: string;
  title: string | null;
  source: "web" | "cli" | "api";
  deviceName: string | null;
  note: string | null;
  createdAt: Date;
  createdBy: string | null;
}

export function VersionHistory({
  publicId,
  versions,
}: {
  publicId: string;
  versions: VersionRow[];
}) {
  const router = useRouter();

  async function restore(version: number) {
    if (!confirm(`Version ${version} wiederherstellen?`)) return;
    const res = await restoreDocumentVersionAction(publicId, version);
    if (!res.ok) {
      toast.error(res.error);
      return;
    }
    toast.success(`Version ${version} wiederhergestellt`);
    router.refresh();
  }

  return (
    <section className="rounded-xl border border-border p-4">
      <h2 className="mb-4 text-lg font-medium">Versionsverlauf</h2>
      {versions.length === 0 ? (
        <p className="text-sm text-muted-foreground">Keine Versionen.</p>
      ) : (
        <ul className="flex flex-col gap-2">
          {versions.map((v) => (
            <li
              key={v.version}
              className="flex flex-col gap-2 rounded-lg border border-border/80 px-3 py-2 sm:flex-row sm:items-center sm:justify-between"
            >
              <div>
                <p className="text-sm font-medium">
                  v{v.version}
                  {v.note ? ` · ${v.note}` : ""}
                </p>
                <p className="text-xs text-muted-foreground">
                  {format(new Date(v.createdAt), "dd.MM.yyyy HH:mm", {
                    locale: de,
                  })}{" "}
                  · {v.source}
                  {v.deviceName ? ` · ${v.deviceName}` : ""}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant="outline">{v.source}</Badge>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => void restore(v.version)}
                >
                  Wiederherstellen
                </Button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
