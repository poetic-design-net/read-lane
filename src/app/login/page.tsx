import {
  MarketingBackdrop,
  MarketingFooter,
  MarketingHeader,
} from "@/components/layout/marketing-shell";
import { AuthForm } from "@/components/auth/auth-form";
import { loginAction } from "@/app/actions/auth";

export default async function LoginPage({
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
          title="Willkommen zurück"
          description="Mit Ihrem Free-Konto teilen Sie Markdown, verwalten Projekte und nutzen die CLI."
          action={loginAction}
          submitLabel="Anmelden"
          mode="login"
          nextPath={nextPath}
        />
      </main>
      <MarketingFooter />
    </MarketingBackdrop>
  );
}
