# Readlane

**Files in. Beautiful pages out.** · *Dokumente schön teilen.*

Web-App zum Veröffentlichen und Teilen von Markdown (und weiteren Formaten) – mit Konto, Free-Slot oder Projekten, Share-Links und CLI.

| | |
| --- | --- |
| **Live** | [https://read-lane.vercel.app](https://read-lane.vercel.app) |
| **Repo** | [github.com/poetic-design-net/read-lane](https://github.com/poetic-design-net/read-lane) |
| **Setup-Guide** | **[docs/GETTING-STARTED.md](docs/GETTING-STARTED.md)** ← Website, App, Build, Deploy, CLI |

---

## Dokumentation

| Doc | Inhalt |
| --- | --- |
| **[Getting Started](docs/GETTING-STARTED.md)** | Website & App, lokal bauen, Vercel-Upload, CLI, Checkliste |
| [API](docs/API.md) | REST `/api/v1` |
| [Backend](docs/backend.md) | Backend-Spezifikation |
| [v2 Product](docs/v2.md) | Produkt-Master (Tarife, Formate, Roadmap) |
| [Brand](docs/brand/README.md) | Logo / Assets |

---

## Schnellstart (lokal)

```bash
git clone https://github.com/poetic-design-net/read-lane.git
cd read-lane
npm install
cp .env.example .env.local
# DATABASE_URL + SESSION_SECRET (≥32) + NEXT_PUBLIC_APP_URL setzen

npm run db:push
npm run dev
```

- Landing: http://localhost:3000  
- Login: http://localhost:3000/login  
- Dashboard: http://localhost:3000/dashboard  

**Konto erforderlich** – ohne Login kein Veröffentlichen.

Admin in Neon anlegen:

```bash
ADMIN_EMAIL=you@example.com ADMIN_PASSWORD='…' npm run db:admin
```

---

## Vercel (Upload / Deploy)

1. Repo mit Vercel verbinden (Branch `main`)  
2. Env: `DATABASE_URL`, `SESSION_SECRET`, `NEXT_PUBLIC_APP_URL=https://read-lane.vercel.app` (**ohne** `/` am Ende)  
3. Deploy → Push auf `main` baut neu  

Details: [Getting Started §4](docs/GETTING-STARTED.md#4-auf-vercel-hochladen-deploy).

---

## Website vs App

| | Route | Zweck |
| --- | --- | --- |
| Website | `/` | Marketing / Landing |
| App | `/login`, `/dashboard`, `/create` | Arbeiten & teilen |
| Share | `/d/{id}`, `/s/{id}` | Öffentliche Dokumentseite |
| CLI | `/cli/authorize` + Terminal | Push aus dem Repo |

---

## CLI

```bash
npm run cli:build
npm install -g ./packages/cli
export PATH="$HOME/bin:$HOME/.npm-global/bin:$PATH"
export READLANE_API_URL=https://read-lane.vercel.app

readlane login
readlane init
readlane push README.md --open
```

Ausführlich: [Getting Started §7](docs/GETTING-STARTED.md#7-cli-installieren--nutzen).

---

## Features (Kern)

- Konto-Pflicht, Free = 1 dauerhafter Share-Link (ersetzen möglich)  
- Pro/Business/Admin: Projekte, mehrere Docs, Passwort, Versionen  
- Markdown, Text, Code, CSV (+ weitere Formate vorbereitet)  
- Live-Vorschau, Sichtbarkeit public / unlisted / password  
- CLI `@readlane/cli` + API `/api/v1`  

Tech: Next.js App Router · TypeScript · Tailwind · shadcn/ui · Neon · Drizzle · Zod  

---

## Umgebungsvariablen (Minimum)

| Variable | Pflicht | Beispiel |
| --- | --- | --- |
| `DATABASE_URL` | ja | Neon Postgres |
| `SESSION_SECRET` | ja | `openssl rand -base64 48` |
| `NEXT_PUBLIC_APP_URL` | ja | `https://read-lane.vercel.app` |

Vollständig: [`.env.example`](.env.example)

---

## Tests & Build

```bash
npm test
npm run typecheck
npm run build
```

---

## Lizenz

Privat / Projekt poetic-design-net – siehe Repository-Einstellungen.
