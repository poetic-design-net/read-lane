import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth/service";
import { listCliTokens } from "@/lib/cli/tokens";
import { listProjectsForUser } from "@/lib/projects/service";
import { AppShell } from "@/components/layout/app-shell";
import { AccountSettings } from "@/components/dashboard/account-settings";
import { CliTokensList } from "@/components/dashboard/cli-tokens-list";
import { appConfig } from "@/lib/config";

export default async function SettingsPage() {
  let user;
  try {
    user = await requireUser();
  } catch {
    redirect("/login");
  }

  const [tokens, projects] = await Promise.all([
    listCliTokens(user.id),
    listProjectsForUser(user.id),
  ]);

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

        <AccountSettings email={user.email} />
      </div>
    </AppShell>
  );
}
