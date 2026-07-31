import {
  MarketingBackdrop,
  MarketingFooter,
  MarketingHeader,
} from "@/components/layout/marketing-shell";
import { AuthForm } from "@/components/auth/auth-form";
import { registerAction } from "@/app/actions/auth";

export default async function RegisterPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  const { next } = await searchParams;
  const nextPath =
    next && next.startsWith("/") && !next.startsWith("//") ? next : undefined;

  return (
    <MarketingBackdrop>
      <MarketingHeader />
      <main className="relative z-10 flex flex-1 items-center justify-center px-4 py-10 sm:py-16">
        <AuthForm
          title="Kostenloses Konto"
          description="Free-Zugang: Dokumente teilen, Projekte organisieren, CLI verbinden. Ohne Konto ist Teilen nicht möglich."
          action={registerAction}
          submitLabel="Free-Konto erstellen"
          mode="register"
          nextPath={nextPath}
        />
      </main>
      <MarketingFooter />
    </MarketingBackdrop>
  );
}
