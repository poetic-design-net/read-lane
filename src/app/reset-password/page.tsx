import { Suspense } from "react";
import {
  MarketingBackdrop,
  MarketingFooter,
  MarketingHeader,
} from "@/components/layout/marketing-shell";
import { ResetPasswordForm } from "@/components/auth/reset-password-form";

export default function ResetPasswordPage() {
  return (
    <MarketingBackdrop>
      <MarketingHeader />
      <main className="relative z-10 flex flex-1 items-center justify-center px-4 py-10 sm:py-16">
        <Suspense>
          <ResetPasswordForm />
        </Suspense>
      </main>
      <MarketingFooter />
    </MarketingBackdrop>
  );
}
