import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth/service";
import { listCliTokens } from "@/lib/cli/tokens";
import { listProjectsForUser } from "@/lib/projects/service";
import { AppShell } from "@/components/layout/app-shell";
import { AccountSettings } from "@/components/dashboard/account-settings";
import { CliTokensList } from "@/components/dashboard/cli-tokens-list";
import { ApiTokenForm } from "@/components/dashboard/api-token-form";
import { getEntitlements } from "@/lib/plans/service";
import { DomainsPanel } from "@/components/dashboard/domains-panel";
import { AuditLogList } from "@/components/dashboard/audit-log-list";
import { listAuditLogs } from "@/lib/audit/service";
import { listDomains, VERIFICATION_PREFIX } from "@/lib/domains/service";
import { appConfig } from "@/lib/config";

export default async function SettingsPage() {
  let user;
  try {
    user = await requireUser();
  } catch {
    redirect("/login");
  }

  const [tokens, projects, { entitlements }, domains] = await Promise.all([
    listCliTokens(user.id),
    listProjectsForUser(user.id),
    getEntitlements(user.id),
    listDomains(user.id),
  ]);

  // Reading the log is a paid feature, so it is only queried when allowed.
  const auditEntries = entitlements.auditLog
    ? await listAuditLogs(user.id, 50)
    : [];

  // Tokens and domains may only be bound to projects the user owns.
  const ownedProjects = projects
    .filter((p) => p.isOwner !== false)
    .map((p) => ({ publicId: p.publicId, name: p.name }));

  return (
    <AppShell projects={projects} user={user} title="Einstellungen">
      <div className="w-full max-w-3xl p-6 sm:p-8 lg:p-10">
        <h1 className="mb-1 text-[28px] font-semibold tracking-[-0.03em] sm:text-[32px]">
          Einstellungen
        </h1>
        <p className="mb-8 text-[15px] text-stone-500">
          Konto und CLI-Zugänge verwalten.
        </p>

        <section className="mb-10">
          <h2 className="mb-2 text-[15px] font-medium">CLI-Zugänge</h2>
          <p className="mb-4 text-[13px] text-stone-400">
            Melden Sie sich mit{" "}
            <code className="rounded bg-stone-100 px-1 text-[12px] dark:bg-stone-800">
              npx {appConfig.cliPackage} login
            </code>{" "}
            an. Aktive Geräte können hier widerrufen werden.
          </p>
          <CliTokensList
            tokens={tokens.map((t) => ({
              ...t,
              createdAt: t.createdAt.toISOString(),
              lastUsedAt: t.lastUsedAt?.toISOString() ?? null,
              expiresAt: t.expiresAt?.toISOString() ?? null,
            }))}
          />
        </section>

        <section className="mb-10">
          <h2 className="mb-2 text-[15px] font-medium">API- und CI/CD-Tokens</h2>
          <p className="mb-4 text-[13px] text-stone-400">
            Für Pipelines und eigene Integrationen. Als{" "}
            <code className="rounded bg-stone-100 px-1 text-[12px] dark:bg-stone-800">
              Authorization: Bearer …
            </code>{" "}
            senden. Projekt-Tokens gelten nur für ihr Projekt.
          </p>
          <ApiTokenForm
            projects={ownedProjects}
            enabled={entitlements.apiAccess}
          />
        </section>

        <section className="mb-10">
          <h2 className="mb-2 text-[15px] font-medium">Eigene Domains</h2>
          <p className="mb-4 text-[13px] text-stone-400">
            Dokumente unter Ihrer eigenen Domain ausliefern — mit eigenem Namen
            und Logo statt {appConfig.name}.
          </p>
          <DomainsPanel
            domains={domains.map((d) => ({
              publicId: d.publicId,
              host: d.host,
              projectName: d.projectName,
              verified: Boolean(d.verifiedAt),
              verificationToken: d.verificationToken,
              brandName: d.brandName,
              brandColor: d.brandColor,
              brandLogoUrl: d.brandLogoUrl,
            }))}
            projects={ownedProjects}
            enabled={entitlements.customDomains}
            verificationPrefix={VERIFICATION_PREFIX}
          />
        </section>

        <section className="mb-10">
          <h2 className="mb-2 text-[15px] font-medium">Audit Log</h2>
          <p className="mb-4 text-[13px] text-stone-400">
            Die letzten sicherheitsrelevanten Ereignisse Ihres Kontos.
          </p>
          <AuditLogList
            entries={auditEntries}
            enabled={entitlements.auditLog}
          />
        </section>

        <AccountSettings email={user.email} />
      </div>
    </AppShell>
  );
}
