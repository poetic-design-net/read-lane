import Link from "next/link";
import { getOptionalUser } from "@/lib/auth/service";
import { Button } from "@/components/ui/button";
import { Logo } from "@/components/brand/logo";
import { logoutAction } from "@/app/actions/auth";
import { cn } from "@/lib/utils";

export {
  PremiumCard,
  MarketingBackdrop,
  MarketingFooter,
} from "./premium-card";

export async function MarketingHeader({
  className,
}: {
  className?: string;
}) {
  const user = await getOptionalUser();

  return (
    <header
      className={cn(
        "relative z-10 mx-auto flex w-full max-w-5xl items-center justify-between gap-4 px-5 py-5 sm:px-8",
        className
      )}
    >
      <Link href="/" className="inline-flex items-center">
        <Logo variant="full" size="lg" showTagline />
      </Link>


      <nav className="flex items-center gap-1.5 sm:gap-2" aria-label="Navigation">
        {user ? (
          <>
            <Button
              variant="ghost"
              size="sm"
              className="rounded-full"
              render={<Link href="/dashboard" />}
            >
              Dashboard
            </Button>
            <form action={logoutAction}>
              <Button
                type="submit"
                variant="outline"
                size="sm"
                className="rounded-full"
              >
                Abmelden
              </Button>
            </form>
          </>
        ) : (
          <>
            <Button
              variant="ghost"
              size="sm"
              className="rounded-full"
              render={<Link href="/login" />}
            >
              Anmelden
            </Button>
            <Button
              size="sm"
              className="rounded-full"
              render={<Link href="/register" />}
            >
              Registrieren
            </Button>
          </>
        )}
      </nav>
    </header>
  );
}
