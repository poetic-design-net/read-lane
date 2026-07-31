import { redirect } from "next/navigation";
import Link from "next/link";
import { consumeMagicLink, AuthError } from "@/lib/auth/service";
import {
  MarketingBackdrop,
  MarketingFooter,
  MarketingHeader,
} from "@/components/layout/marketing-shell";

interface PageProps {
  searchParams: Promise<{ token?: string }>;
}

export default async function MagicConsumePage({ searchParams }: PageProps) {
  const { token } = await searchParams;
  if (!token) {
    return (
      <MarketingBackdrop>
        <MarketingHeader />
        <main className="relative z-10 mx-auto flex max-w-md flex-1 flex-col items-center justify-center px-4 py-20 text-center">
          <h1 className="text-[22px] font-semibold tracking-tight">
            Ungültiger Link
          </h1>
          <Link
            href="/login"
            className="mt-4 text-[14px] text-stone-500 underline underline-offset-4"
          >
            Zur Anmeldung
          </Link>
        </main>
        <MarketingFooter />
      </MarketingBackdrop>
    );
  }

  try {
    await consumeMagicLink(token);
    redirect("/dashboard");
  } catch (e) {
    const msg =
      e instanceof AuthError ? e.message : "Link ungültig oder abgelaufen";
    return (
      <MarketingBackdrop>
        <MarketingHeader />
        <main className="relative z-10 mx-auto flex max-w-md flex-1 flex-col items-center justify-center px-4 py-20 text-center">
          <h1 className="text-[22px] font-semibold tracking-tight">{msg}</h1>
          <Link
            href="/login/magic"
            className="mt-4 text-[14px] text-stone-500 underline underline-offset-4"
          >
            Neuen Link anfordern
          </Link>
        </main>
        <MarketingFooter />
      </MarketingBackdrop>
    );
  }
}
