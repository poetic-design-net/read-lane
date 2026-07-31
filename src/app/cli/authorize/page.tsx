import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth/service";
import {
  MarketingBackdrop,
  MarketingFooter,
  MarketingHeader,
} from "@/components/layout/marketing-shell";
import { CliAuthorizeForm } from "@/components/cli/authorize-form";

interface PageProps {
  searchParams: Promise<{ code?: string }>;
}

export default async function CliAuthorizePage({ searchParams }: PageProps) {
  const { code } = await searchParams;
  try {
    await requireUser();
  } catch {
    redirect(
      `/login?next=${encodeURIComponent(`/cli/authorize${code ? `?code=${code}` : ""}`)}`
    );
  }

  return (
    <MarketingBackdrop>
      <MarketingHeader />
      <main className="relative z-10 flex flex-1 items-center justify-center px-4 py-10 sm:py-16">
        <CliAuthorizeForm initialCode={code?.toUpperCase() ?? ""} />
      </main>
      <MarketingFooter />
    </MarketingBackdrop>
  );
}
