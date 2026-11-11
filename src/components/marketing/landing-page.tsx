import Link from "next/link";
import { LogoMark } from "@/components/brand/logo";
import { brandFontVars } from "@/components/brand/fonts";
import { appConfig } from "@/lib/config";
import { brandConfig } from "@/lib/brand/config";
import { appPath } from "@/lib/urls/hosts";

const AGENCY_URL = "https://www.poetic-design.net";

const features = [
  {
    title: "Gesetzt, nicht getippt",
    body: "Aus Markdown wird eine ruhige Seite mit sauberer Typografie. Tabellen, Listen und Code inklusive.",
  },
  {
    title: "Ein Link statt Anhang",
    body: "Der Empfänger öffnet die Seite im Browser. Kein Konto, kein Download, kein Format, das nicht aufgeht.",
  },
  {
    title: "Bleibt aktuell",
    body: "Ändert sich der Stand, wird die Seite aktualisiert. Der Link bleibt derselbe, frühere Fassungen bleiben erhalten.",
  },
  {
    title: "Nur für die Richtigen",
    body: "Seiten sind nicht gelistet und tauchen in keiner Suche auf. Auf Wunsch zusätzlich mit Passwort.",
  },
] as const;

export function LandingPage() {
  const register = appPath("/register");
  const login = appPath("/login");

  return (
    <div className={`brand-page min-h-[100dvh] ${brandFontVars}`}>
      <header className="mx-auto flex w-full max-w-6xl items-center justify-between gap-4 px-5 py-6 sm:px-10">
        <Link href="/" className="flex items-center gap-3">
          <LogoMark size="md" />
          <span className="brand-label whitespace-nowrap text-[13px]">
            {appConfig.name}
          </span>
        </Link>
        <nav className="flex items-center gap-2" aria-label="Navigation">
          <a href={login} className="brand-button brand-button-ghost">
            Anmelden
          </a>
          <a href={register} className="brand-button max-sm:!hidden">
            Konto erstellen
          </a>
        </nav>
      </header>

      <main>
        <section className="mx-auto grid max-w-6xl gap-14 px-5 pb-20 pt-12 sm:px-10 sm:pt-20 lg:grid-cols-[1.1fr_1fr] lg:items-center lg:gap-20 lg:pb-28">
          <div>
            <p className="brand-label mb-6 flex items-center gap-3 text-[12px]">
              <span aria-hidden className="brand-pixel" />
              {brandConfig.claimEn}
            </p>
            <h1 className="brand-title">{brandConfig.heroHeadlineDe}</h1>
            <p className="brand-lead mt-7 max-w-[34rem]">
              {brandConfig.heroSubDe}
            </p>
            <div className="mt-10 flex flex-wrap gap-3">
              <a href={login} className="brand-button">
                Anmelden
              </a>
              <a href={register} className="brand-button brand-button-ghost">
                Konto erstellen
              </a>
            </div>
          </div>

          {/* A sample note, set the way a shared page looks. */}
          <div aria-hidden className="brand-sheet p-8 sm:p-10">
            <p className="brand-label mb-4 flex items-center gap-3 text-[11px]">
              <span className="brand-pixel" />
              Atelier Nord · 11. November
            </p>
            <p className="brand-sheet-title">Projekt-Update KW 46</p>
            <p className="mt-4 text-[17px] leading-relaxed">
              Die Startseite steht und läuft auf der Testumgebung. Für den
              Livegang fehlen noch die finalen Texte.
            </p>
            <p className="brand-sheet-heading mt-7">Nächste Schritte</p>
            <ol className="mt-3 list-decimal space-y-1.5 pl-5 text-[17px]">
              <li>Feedback zur Startseite bis Freitag</li>
              <li>Texte für die Unterseiten liefern</li>
              <li>Termin für die Abnahme festlegen</li>
            </ol>
          </div>
        </section>

        <section className="brand-band py-20 sm:py-24">
          <div className="mx-auto max-w-6xl px-5 sm:px-10">
            <h2 className="brand-section-title max-w-xl">
              Für alles, was mehr verdient als eine lange Mail.
            </h2>
            <dl className="mt-14 grid gap-x-16 gap-y-12 sm:grid-cols-2">
              {features.map((f, i) => (
                <div key={f.title}>
                  <dt>
                    <span className="brand-label text-[12px]">
                      {String(i + 1).padStart(2, "0")}
                    </span>
                    <span className="brand-sheet-heading mt-2 block">
                      {f.title}
                    </span>
                  </dt>
                  <dd className="mt-3 max-w-md text-[18px] leading-relaxed">
                    {f.body}
                  </dd>
                </div>
              ))}
            </dl>
          </div>
        </section>

        <section className="mx-auto max-w-6xl px-5 py-20 sm:px-10 sm:py-24">
          <h2 className="brand-section-title max-w-2xl">
            Ein Werkzeug von Poetic Design. Offen für alle, die schöner
            schreiben wollen.
          </h2>
          <div className="mt-10 flex flex-wrap gap-3">
            <a href={register} className="brand-button">
              Konto erstellen
            </a>
            <a href={AGENCY_URL} className="brand-button brand-button-ghost">
              poetic-design.net
            </a>
          </div>
        </section>
      </main>

      <footer className="brand-footer py-10">
        <div className="mx-auto flex max-w-6xl flex-col gap-4 px-5 text-[15px] sm:px-10 sm:flex-row sm:items-baseline sm:justify-between">
          <span className="brand-label text-[12px]">
            © {new Date().getFullYear()} Poetic Design
          </span>
          <nav className="flex flex-wrap gap-x-6 gap-y-2">
            <a href={login} className="hover:underline">
              Anmelden
            </a>
            <Link href="/privacy" className="hover:underline">
              Datenschutz
            </Link>
            <Link href="/imprint" className="hover:underline">
              Impressum
            </Link>
            <a href={AGENCY_URL} className="brand-link">
              poetic-design.net
            </a>
          </nav>
        </div>
      </footer>
    </div>
  );
}
