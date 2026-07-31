# Readlane

Produktionsreife Web-App zum Veröffentlichen und Teilen von Markdown-Dokumenten – inklusive Projekten, Dashboard, Passwortschutz und CLI-Workflow.

**Markdown schön teilen.** · *Publish beautifully.*

Brand assets: `public/brand/` · React: `src/components/brand/logo.tsx`

## Features

### Kern

- Markdown hochladen (Drag & Drop) oder einfügen
- Live-Vorschau (GFM, Tabellen, Checklisten, Code + Shiki)
- Sichtbarkeit: öffentlich · unlisted · passwortgeschützt
- Getrennte Share- und Verwaltungslinks
- Theme, Lesebreite, Schrift, TOC, Zeilennummern
- Optionale Ablaufzeit

### Projekte & CLI

- Benutzerkonten, Dashboard, Projekte, Versionsverlauf
- Versionierte API unter `/api/v1`
- CLI `@readlane/cli`: `login`, `init`, `push`, `status`, `open`, `pull`, `diff`, `archive`
- Konfiguration: `.readlane.json` (keine Secrets)
- CI-Token: `READLANE_TOKEN`

## Tech Stack

Next.js (App Router) · TypeScript · Tailwind · shadcn/ui · PostgreSQL (Neon) · Drizzle · Zod · bcrypt · nanoid · jose

## Schnellstart

```bash
npm install
cp .env.example .env.local
# DATABASE_URL und SESSION_SECRET setzen

npm run db:push
npm run dev
```

**Konto erforderlich.** Ohne Anmeldung kann nichts geteilt werden.

### Tarife (v2)

| Free | Pro |
| --- | --- |
| 1 aktiver Share-Link (unbegrenzt ersetzen) | Unbegrenzt Dokumente |
| Markdown, Text, Code, CSV | + Projekte, Passwort, Versionen, CLI |
| Keine Projekte | Stripe-Upgrade |

Free-Dashboard: „Dein kostenloser Link“. Zweites Dokument → Upgrade oder ersetzen (Link bleibt).

Lokal:

- Landing: [http://localhost:3000](http://localhost:3000)
- Registrieren / Anmelden → Dashboard / Create
- Dashboard: [http://localhost:3000/dashboard](http://localhost:3000/dashboard)

Produktion:

- Marketing: `https://readlane.io`
- App: `https://app.readlane.io` (`/` → Dashboard)

Umgebungsvariablen: `NEXT_PUBLIC_APP_URL`, optional `NEXT_PUBLIC_MARKETING_URL`.

### CLI

```bash
npm run cli:build
npm install -g ./packages/cli

readlane login
readlane init
readlane push README.md --open
readlane push --all
readlane status
```

CI:

```bash
READLANE_TOKEN=… READLANE_API_URL=https://app.readlane.io readlane push --all --yes
```

## Umgebungsvariablen

| Variable | Pflicht | Beschreibung |
| --- | --- | --- |
| `DATABASE_URL` | ja | Neon/Postgres |
| `SESSION_SECRET` | ja (Prod) | Session-Signing |
| `NEXT_PUBLIC_APP_URL` | ja | z. B. `http://localhost:3000` |
| `NEXT_PUBLIC_APP_NAME` | nein | Standard: Readlane |
| `NEXT_PUBLIC_CLI_NAME` | nein | Standard: `readlane` |
| `NEXT_PUBLIC_CLI_PACKAGE` | nein | Standard: `@readlane/cli` |
| `READLANE_TOKEN` | CI | CLI-Zugriffstoken |
| `READLANE_API_URL` | CI | API-Basis-URL |

## CLI-Einstellungspriorität

1. Explizite CLI-Option  
2. YAML-Frontmatter  
3. Lokale `.readlane.json`  
4. Projektstandard  
5. App-Standard  

## Tests

```bash
npm test
npm run typecheck
npm run lint
npm run build
```
