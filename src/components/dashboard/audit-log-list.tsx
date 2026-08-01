import Link from "next/link";
import { format } from "date-fns";
import { de } from "date-fns/locale";

/** German labels for the audit actions an account owner can see. */
const ACTION_LABELS: Record<string, string> = {
  "user.login": "Anmeldung",
  "user.password_changed": "Passwort geändert",
  "user.account_deleted": "Konto gelöscht",
  "subscription.upgraded": "Tarif erhöht",
  "subscription.downgraded": "Tarif reduziert",
  "subscription.canceled": "Tarif gekündigt",
  "project.created": "Projekt erstellt",
  "project.updated": "Projekt geändert",
  "project.archived": "Projekt archiviert",
  "project.deleted": "Projekt gelöscht",
  "project.member_added": "Mitglied hinzugefügt",
  "project.member_role_changed": "Rolle geändert",
  "project.member_removed": "Mitglied entfernt",
  "document.created": "Dokument erstellt",
  "document.updated": "Dokument geändert",
  "document.replaced": "Dokument ersetzt",
  "document.published": "Dokument veröffentlicht",
  "document.archived": "Dokument archiviert",
  "document.restored": "Version wiederhergestellt",
  "document.deleted": "Dokument gelöscht",
  "document.password_enabled": "Passwortschutz aktiviert",
  "document.password_disabled": "Passwortschutz entfernt",
  "document.share_link_rotated": "Share-Link erneuert",
  "cli.device_approved": "CLI-Gerät bestätigt",
  "cli.device_revoked": "CLI-Gerät widerrufen",
  "domain.verified": "Domain verifiziert",
  "api_token.created": "API-Token erstellt",
  "api_token.revoked": "API-Token widerrufen",
  "file.uploaded": "Datei hochgeladen",
  "billing.checkout_started": "Bezahlvorgang gestartet",
};

const ACTOR_LABELS: Record<string, string> = {
  user: "Web",
  cli: "CLI",
  api: "API",
  system: "System",
  stripe: "Stripe",
};

export function AuditLogList({
  entries,
  enabled,
}: {
  entries: Array<{
    id: string;
    action: string;
    actorType: string;
    createdAt: Date;
  }>;
  enabled: boolean;
}) {
  if (!enabled) {
    return (
      <p className="text-[13px] text-stone-500">
        Audit Logs sind Teil von Business.{" "}
        <Link
          href="/dashboard/upgrade"
          className="font-medium text-stone-700 underline-offset-2 hover:underline dark:text-stone-200"
        >
          Tarif ansehen
        </Link>
      </p>
    );
  }

  if (entries.length === 0) {
    return (
      <p className="text-[13px] text-stone-400">Noch keine Ereignisse.</p>
    );
  }

  return (
    <ul className="divide-y divide-stone-100 rounded-xl border border-border dark:divide-stone-800">
      {entries.map((e) => (
        <li
          key={e.id}
          className="flex items-center justify-between gap-3 px-3.5 py-2.5 text-[13px]"
        >
          <span className="truncate text-stone-700 dark:text-stone-200">
            {ACTION_LABELS[e.action] ?? e.action}
          </span>
          <span className="shrink-0 text-[11px] text-stone-400">
            {ACTOR_LABELS[e.actorType] ?? e.actorType} ·{" "}
            {format(e.createdAt, "dd.MM.yyyy HH:mm", { locale: de })}
          </span>
        </li>
      ))}
    </ul>
  );
}
