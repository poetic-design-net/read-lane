import {
  MarketingBackdrop,
  MarketingFooter,
  MarketingHeader,
} from "@/components/layout/marketing-shell";
import { appConfig } from "@/lib/config";

export default function ImprintPage() {
  const { imprint } = appConfig.legal;
  return (
    <MarketingBackdrop>
      <MarketingHeader />
      <main className="relative z-10 mx-auto w-full max-w-2xl flex-1 px-5 py-12 sm:px-8">
        <div className="rounded-[22px] border border-white/80 bg-white/90 p-7 shadow-[0_16px_40px_-20px_rgba(15,15,15,0.12)] ring-1 ring-black/[0.03] dark:border-white/10 dark:bg-stone-900/90 sm:p-10">
          <h1 className="text-[28px] font-semibold tracking-[-0.03em] text-stone-900 dark:text-stone-50">
            {imprint.title}
          </h1>
          <div className="mt-8 flex flex-col gap-8">
            {imprint.sections.map((s) => (
              <section key={s.heading}>
                <h2 className="text-[16px] font-medium text-stone-800 dark:text-stone-100">
                  {s.heading}
                </h2>
                <p className="mt-2 whitespace-pre-line text-[14px] leading-relaxed text-stone-500">
                  {s.body}
                </p>
              </section>
            ))}
          </div>
        </div>
      </main>
      <MarketingFooter />
    </MarketingBackdrop>
  );
}
