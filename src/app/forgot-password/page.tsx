import {
  MarketingBackdrop,
  MarketingFooter,
  MarketingHeader,
} from "@/components/layout/marketing-shell";
import { ForgotPasswordForm } from "@/components/auth/forgot-password-form";

export default function ForgotPasswordPage() {
  return (
    <MarketingBackdrop>
      <MarketingHeader />
      <main className="relative z-10 flex flex-1 items-center justify-center px-4 py-10 sm:py-16">
        <ForgotPasswordForm />
      </main>
      <MarketingFooter />
    </MarketingBackdrop>
  );
}
