import Link from "next/link";
import {
  MarketingBackdrop,
  MarketingFooter,
  MarketingHeader,
} from "@/components/layout/marketing-shell";

export default function NotFound() {
  return (
    <MarketingBackdrop>
      <MarketingHeader />
      <main className="relative z-10 flex flex-1 items-center justify-center px-4 py-20">
        <div className="max-w-md rounded-[22px] border border-white/80 bg-white/95 px-8 py-10 text-center shadow-[0_20px_50px_-20px_rgba(15,15,15,0.14)] ring-1 ring-black/[0.03] dark:border-white/10 dark:bg-stone-900">
          <p className="text-[12px] font-medium uppercase tracking-[0.14em] text-stone-400">
            404
          </p>
          <h1 className="mt-2 text-[24px] font-semibold tracking-tight text-stone-900 dark:text-stone-50">
            Seite nicht gefunden
          </h1>
          <p className="mt-2 text-[14px] text-stone-500">
            Das angeforderte Dokument oder die Seite existiert nicht.
          </p>
          <Link
            href="/"
            className="mt-6 inline-flex h-9 items-center rounded-full bg-stone-900 px-4 text-[13px] font-medium text-white dark:bg-stone-100 dark:text-stone-900"
          >
            Zur Startseite
          </Link>
        </div>
      </main>
      <MarketingFooter />
    </MarketingBackdrop>
  );
}
