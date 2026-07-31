import {
  MarketingBackdrop,
  MarketingFooter,
  MarketingHeader,
} from "@/components/layout/marketing-shell";
import { MagicLinkForm } from "@/components/auth/magic-link-form";

export default function MagicLoginPage() {
  return (
    <MarketingBackdrop>
      <MarketingHeader />
      <main className="relative z-10 flex flex-1 items-center justify-center px-4 py-10 sm:py-16">
        <MagicLinkForm />
      </main>
      <MarketingFooter />
    </MarketingBackdrop>
  );
}
