import Link from "next/link";
import {
  ArrowRight,
  FileText,
  FolderKanban,
  Lock,
  Terminal,
  Sparkles,
} from "lucide-react";
import { Logo } from "@/components/brand/logo";
import { Button } from "@/components/ui/button";
import { appConfig } from "@/lib/config";
import { brandConfig } from "@/lib/brand/config";
import { appPath } from "@/lib/urls/hosts";

const features = [
  {
    icon: Sparkles,
    title: "Schön formatiert",
    body: "Markdown wird automatisch in ein ruhiges, typografisches Layout verwandelt — Tabellen, Code, Listen inklusive.",
  },
  {
    icon: Lock,
    title: "Sicher geteilt",
    body: "Öffentlich, unlisted oder mit Passwort. Sie entscheiden, wer den Link öffnen kann.",
  },
  {
    icon: FolderKanban,
    title: "Projekte & Übersicht",
    body: "Beliebig viele Dokumente in Projekten organisieren — mit Status, Vorschau und Versionsverlauf.",
  },
  {
    icon: Terminal,
    title: "CLI-Workflow",
    body: "Direkt aus VS Code oder dem Terminal pushen — schnell, ohne Copy-Paste-Chaos.",
  },
] as const;

export function LandingPage() {
  const register = appPath("/register");
  const login = appPath("/login");
  const appHome = appPath("/dashboard");

  return (
    <div className="relative min-h-[100dvh] overflow-x-hidden bg-[#f4f3f0] text-[#2B313B]">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 h-[70vh] bg-[radial-gradient(ellipse_at_50%_-10%,rgba(255,255,255,0.95),transparent_55%)]"
      />

      <header className="relative z-20 mx-auto flex w-full max-w-6xl items-center justify-between gap-4 px-5 py-5 sm:px-8 lg:px-10">
        <Link href="/" className="inline-flex items-center">
          <Logo variant="full" size="lg" />
        </Link>
        <nav
          className="flex items-center gap-1.5 sm:gap-2"
          aria-label="Navigation"
        >
          <a
            href="#features"
            className="hidden rounded-full px-3 py-1.5 text-[13px] font-medium text-stone-500 transition hover:text-stone-800 sm:inline"
          >
            Features
          </a>
          <a
            href="#product"
            className="hidden rounded-full px-3 py-1.5 text-[13px] font-medium text-stone-500 transition hover:text-stone-800 sm:inline"
          >
            Produkt
          </a>
          <Button
            variant="ghost"
            size="sm"
            className="rounded-full"
            render={<a href={login} />}
          >
            Anmelden
          </Button>
          <Button
            size="sm"
            className="rounded-full bg-[#2B313B] text-white hover:bg-[#1a1e24]"
            render={<a href={register} />}
          >
            Free-Konto
          </Button>
        </nav>
      </header>

      <section className="relative z-10 mx-auto max-w-6xl px-5 pb-8 pt-6 text-center sm:px-8 sm:pt-10 lg:px-10">
        <p className="mb-4 text-[11px] font-medium uppercase tracking-[0.18em] text-[#6B7C93]">
          {brandConfig.claimEn}
        </p>
        <h1 className="mx-auto max-w-3xl text-[2.5rem] font-semibold leading-[1.08] tracking-[-0.04em] text-[#121417] sm:text-[3.25rem] md:text-[3.75rem]">
          {brandConfig.heroHeadlineDe}
        </h1>
        <p className="mx-auto mt-4 max-w-xl text-[16px] leading-relaxed text-stone-500 sm:text-[17px]">
          {brandConfig.heroSubDe}
        </p>
        <div className="mt-7 flex flex-wrap items-center justify-center gap-3">
          <Button
            size="lg"
            className="h-11 rounded-full bg-[#2B313B] px-6 text-[14px] text-white hover:bg-[#1a1e24]"
            render={<a href={register} />}
          >
            Kostenlos veröffentlichen
            <ArrowRight data-icon="inline-end" className="size-4" />
          </Button>
          <Button
            size="lg"
            variant="outline"
            className="h-11 rounded-full border-stone-300/80 bg-white/70 px-6 text-[14px] backdrop-blur"
            render={<a href={login} />}
          >
            Anmelden
          </Button>
        </div>
        <p className="mt-3 text-[12px] text-stone-400">
          Free: 1 dauerhafter Link. Pro: Projekte, Passwort, CLI. Konto
          erforderlich.
        </p>
      </section>

      <section
        id="product"
        className="relative z-10 mx-auto w-full max-w-6xl px-4 pb-16 sm:px-8 lg:px-10"
      >
        <div className="relative mx-auto">
          <div
            aria-hidden
            className="pointer-events-none absolute inset-x-[8%] -bottom-6 h-16 rounded-[50%] bg-stone-900/10 blur-2xl"
          />
          <div className="overflow-hidden rounded-[18px] bg-white shadow-[0_1px_1px_rgba(15,15,15,0.04),0_28px_80px_-24px_rgba(15,15,15,0.28)] ring-1 ring-black/[0.06] sm:rounded-[22px]">
            <div className="flex h-10 items-center gap-2 border-b border-stone-100 bg-[#fafaf9] px-4">
              <span className="size-2.5 rounded-full bg-[#ff5f57]" />
              <span className="size-2.5 rounded-full bg-[#febc2e]" />
              <span className="size-2.5 rounded-full bg-[#28c840]" />
              <span className="mx-auto pr-10 text-[12px] font-medium text-stone-400">
                {appConfig.name}
              </span>
            </div>
            <picture>
              <source
                srcSet="/marketing/product-hero.avif"
                type="image/avif"
              />
              <img
                src="/marketing/product-hero.jpg"
                alt={`${appConfig.name} — Markdown-Dokumente veröffentlichen und teilen`}
                width={1600}
                height={1000}
                className="block h-auto w-full"
                decoding="async"
                fetchPriority="high"
              />
            </picture>
          </div>
        </div>
      </section>

      <section
        id="features"
        className="relative z-10 border-t border-stone-200/70 bg-[#f7f6f3] py-16 sm:py-20"
      >
        <div className="mx-auto max-w-6xl px-5 sm:px-8 lg:px-10">
          <div className="mx-auto max-w-2xl text-center">
            <p className="text-[11px] font-medium uppercase tracking-[0.16em] text-[#6B7C93]">
              Warum {appConfig.name}
            </p>
            <h2 className="mt-2 text-[1.75rem] font-semibold tracking-[-0.03em] text-[#121417] sm:text-[2rem]">
              Ein ruhiges Workspace für gutes Markdown.
            </h2>
            <p className="mt-3 text-[15px] leading-relaxed text-stone-500">
              Mit Free-Konto: viele Dokumente, Projekte, Sichtbarkeiten und CLI —
              ohne Ballast.
            </p>
          </div>

          <ul className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {features.map(({ icon: Icon, title, body }) => (
              <li
                key={title}
                className="rounded-2xl bg-white/80 p-5 shadow-sm ring-1 ring-black/[0.04]"
              >
                <span className="mb-3 flex size-9 items-center justify-center rounded-full bg-stone-50 ring-1 ring-stone-100">
                  <Icon
                    className="size-4 text-[#6B7C93]"
                    strokeWidth={1.75}
                  />
                </span>
                <h3 className="text-[14px] font-semibold tracking-tight text-[#2B313B]">
                  {title}
                </h3>
                <p className="mt-1.5 text-[13px] leading-relaxed text-stone-500">
                  {body}
                </p>
              </li>
            ))}
          </ul>
        </div>
      </section>

      <section className="relative z-10 py-16 sm:py-20">
        <div className="mx-auto max-w-6xl px-5 sm:px-8 lg:px-10">
          <div className="grid items-start gap-10 lg:grid-cols-2 lg:gap-16">
            <div>
              <p className="text-[11px] font-medium uppercase tracking-[0.16em] text-[#6B7C93]">
                So funktioniert&apos;s
              </p>
              <h2 className="mt-2 text-[1.75rem] font-semibold tracking-[-0.03em] text-[#121417]">
                Konto. Dokument. Link.
              </h2>
              <ol className="mt-8 space-y-5">
                {[
                  {
                    n: "01",
                    t: "Free-Konto erstellen",
                    d: "Kostenlos anmelden — ohne Konto ist Teilen gesperrt.",
                  },
                  {
                    n: "02",
                    t: "Markdown veröffentlichen",
                    d: "Hochladen, Darstellung wählen, optional Passwort setzen.",
                  },
                  {
                    n: "03",
                    t: "Teilen & verwalten",
                    d: "Share-Link versenden, im Dashboard bearbeiten, per CLI syncen.",
                  },
                ].map((step) => (
                  <li key={step.n} className="flex gap-4">
                    <span className="font-mono text-[12px] font-medium text-[#6B7C93]">
                      {step.n}
                    </span>
                    <div>
                      <p className="text-[15px] font-semibold text-[#2B313B]">
                        {step.t}
                      </p>
                      <p className="mt-0.5 text-[13px] text-stone-500">
                        {step.d}
                      </p>
                    </div>
                  </li>
                ))}
              </ol>
            </div>

            <div className="rounded-[22px] bg-[#2B313B] p-6 text-stone-200 shadow-[0_24px_60px_-28px_rgba(15,15,15,0.45)] sm:p-8">
              <div className="mb-4 flex items-center gap-2 text-[12px] text-stone-400">
                <FileText className="size-3.5" strokeWidth={1.75} />
                Free-Plan · Konto nötig
              </div>
              <p className="text-[18px] font-semibold tracking-tight text-white">
                Alles, was Sie zum Teilen brauchen.
              </p>
              <p className="mt-2 text-[13px] leading-relaxed text-stone-400">
                Unbegrenzt Dokumente im MVP, Projekte, CLI-Zugänge und
                Versionsverlauf — mit einem kostenlosen Konto.
              </p>
              <pre className="mt-5 overflow-x-auto rounded-xl bg-black/40 p-4 font-mono text-[12px] leading-relaxed text-stone-300">
                <span className="text-stone-500">$ </span>
                {appConfig.cliName} login{"\n"}
                <span className="text-stone-500">$ </span>
                {appConfig.cliName} push README.md --open{"\n"}
                <span className="text-emerald-400">✓</span> veröffentlicht
              </pre>
              <div className="mt-5 flex flex-wrap gap-2">
                <Button
                  size="sm"
                  className="rounded-full bg-white text-[#2B313B] hover:bg-stone-100"
                  render={<a href={register} />}
                >
                  Free-Konto erstellen
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  className="rounded-full border-white/15 bg-transparent text-white hover:bg-white/10"
                  render={<a href={appHome} />}
                >
                  Zur App
                </Button>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="relative z-10 border-t border-stone-200/70 bg-white/50 py-16">
        <div className="mx-auto max-w-3xl px-5 text-center sm:px-8">
          <h2 className="text-[1.75rem] font-semibold tracking-[-0.03em] text-[#121417]">
            Bereit, Markdown schön zu teilen?
          </h2>
          <p className="mt-3 text-[15px] text-stone-500">
            Erstellen Sie Ihr Free-Konto und veröffentlichen Sie Ihr erstes
            Dokument.
          </p>
          <div className="mt-6 flex flex-wrap justify-center gap-3">
            <Button
              size="lg"
              className="h-11 rounded-full bg-[#2B313B] px-6 text-white hover:bg-[#1a1e24]"
              render={<a href={register} />}
            >
              Kostenlos starten
              <ArrowRight data-icon="inline-end" className="size-4" />
            </Button>
          </div>
        </div>
      </section>

      <footer className="relative z-10 border-t border-stone-200/70 py-8">
        <div className="mx-auto flex max-w-6xl flex-col gap-4 px-5 text-[13px] text-stone-400 sm:flex-row sm:items-center sm:justify-between sm:px-8 lg:px-10">
          <div className="flex items-center gap-3">
            <Logo variant="mark" size="sm" />
            <p>
              © {new Date().getFullYear()} {appConfig.name}
            </p>
          </div>
          <nav className="flex flex-wrap gap-4">
            <a href={login} className="hover:text-stone-700">
              Anmelden
            </a>
            <a href={register} className="hover:text-stone-700">
              Free-Konto
            </a>
            <Link href="/privacy" className="hover:text-stone-700">
              Datenschutz
            </Link>
            <Link href="/imprint" className="hover:text-stone-700">
              Impressum
            </Link>
          </nav>
        </div>
      </footer>
    </div>
  );
}
