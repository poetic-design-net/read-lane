import Link from "next/link";
import { redirect } from "next/navigation";
import { Check } from "lucide-react";
import { requireUser } from "@/lib/auth/service";
import { listProjectsForUser } from "@/lib/projects/service";
import { ProductShell } from "@/components/workspace/product-shell";
import { WorkspaceSidebar } from "@/components/workspace/workspace-sidebar";
import { Button } from "@/components/ui/button";
import { planConfig } from "@/lib/plans/config";
import { getUserPlan } from "@/lib/plans/service";
import { appConfig } from "@/lib/config";

export default async function UpgradePage() {
  let user;
  try {
    user = await requireUser();
  } catch {
    redirect("/login?next=/dashboard/upgrade");
  }

  const [projects, plan] = await Promise.all([
    listProjectsForUser(user.id),
    getUserPlan(user.id),
  ]);

  const pro = planConfig.pro;
  const free = planConfig.free;

  return (
    <ProductShell
      userInitial={user.name || user.email}
      centerTitle="Upgrade"
      sidebar={
        <WorkspaceSidebar projects={projects} user={user} />
      }
    >
      <div className="mx-auto h-full max-w-3xl overflow-y-auto px-6 py-10 sm:px-10">
        <h1 className="text-[32px] font-semibold tracking-[-0.035em]">
          Mehr als ein Link
        </h1>
        <p className="mt-2 text-[15px] text-stone-500">
          Free: {free.activeDocuments} aktiver Link. Pro: Projekte, Passwort,
          Versionsverlauf und CLI.
        </p>

        <div className="mt-8 grid gap-4 sm:grid-cols-2">
          <div className="rounded-2xl bg-stone-50 p-5 ring-1 ring-stone-100 dark:bg-stone-900 dark:ring-stone-800">
            <p className="text-[13px] font-semibold">{free.name}</p>
            <p className="mt-1 text-[12px] text-stone-400">Aktueller Plan</p>
            <ul className="mt-4 space-y-2 text-[13px] text-stone-600 dark:text-stone-300">
              <li className="flex gap-2">
                <Check className="size-3.5 shrink-0 text-stone-400" />1
                dauerhafter Share-Link
              </li>
              <li className="flex gap-2">
                <Check className="size-3.5 shrink-0 text-stone-400" />
                Unbegrenzte Updates
              </li>
              <li className="flex gap-2">
                <Check className="size-3.5 shrink-0 text-stone-400" />
                Markdown, Text, Code, CSV
              </li>
            </ul>
          </div>

          <div className="rounded-2xl bg-stone-900 p-5 text-stone-200">
            <p className="text-[13px] font-semibold text-white">{pro.name}</p>
            <p className="mt-1 text-[12px] text-stone-400">
              {plan === "pro" || plan === "business"
                ? "Aktiv"
                : "Upgrade"}
            </p>
            <ul className="mt-4 space-y-2 text-[13px]">
              <li className="flex gap-2">
                <Check className="size-3.5 shrink-0 text-emerald-400" />
                Unbegrenzt Dokumente
              </li>
              <li className="flex gap-2">
                <Check className="size-3.5 shrink-0 text-emerald-400" />
                Projekte &amp; Passwortschutz
              </li>
              <li className="flex gap-2">
                <Check className="size-3.5 shrink-0 text-emerald-400" />
                Versionsverlauf &amp; CLI
              </li>
            </ul>
            {plan === "free" ? (
              <form action="/api/billing/checkout" method="POST" className="mt-5">
                <input type="hidden" name="plan" value="pro" />
                <input type="hidden" name="interval" value="monthly" />
                <Button
                  type="submit"
                  size="sm"
                  className="w-full rounded-full bg-white text-stone-900 hover:bg-stone-100"
                >
                  Pro freischalten
                </Button>
              </form>
            ) : (
              <p className="mt-5 text-[12px] text-emerald-400">
                Du nutzt bereits {planConfig[plan].name}.
              </p>
            )}
            <p className="mt-3 text-[11px] text-stone-500">
              Stripe Checkout (ENV-Keys erforderlich). Lokal: Plan manuell in
              der DB setzen.
            </p>
          </div>
        </div>

        <p className="mt-8 text-center text-[12px] text-stone-400">
          <Link href="/dashboard" className="underline-offset-2 hover:underline">
            ← Zurück zum Dashboard
          </Link>
          {" · "}
          {appConfig.name}
        </p>
      </div>
    </ProductShell>
  );
}
