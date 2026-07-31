# Readlane – Setup, Build & Upload

Kurzüberblick: **Website** (Marketing) und **App** (Dashboard, Share-Links, CLI) in einem Next.js-Projekt.

**Live (aktuell):** [https://read-lane.vercel.app](https://read-lane.vercel.app)

**Repo:** [github.com/poetic-design-net/read-lane](https://github.com/poetic-design-net/read-lane)

---

## 1. Was ist was?

| Teil | URL / Pfad | Zweck |
| --- | --- | --- |
| **Website / Landing** | `/` | Marketing, Produkt erklären, CTA „Konto erstellen“ |
| **App – Login** | `/login`, `/register` | Konto (Pflicht zum Teilen) |
| **App – Dashboard** | `/dashboard` | Dokumente, Free-Slot oder Projekte |
| **App – Create** | `/create` | Datei hochladen & veröffentlichen |
| **Share-Link** | `/d/{id}` oder `/s/{id}` | Öffentliche Dokumentseite |
| **CLI-Freigabe** | `/cli/authorize` | Device-Login fürs Terminal |
| **API** | `/api/v1/*` | REST für App & CLI |

Ohne Konto kann **nichts** veröffentlicht werden.

### Tarife (kurz)

| Free | Pro / Business / Admin |
| --- | --- |
| 1 aktiver Share-Link | Unbegrenzt Dokumente |
| Link bleibt beim Ersetzen | Projekte, Passwort, Versionen, CLI-Projekte |
| Keine Projekte | volle Workspace-UI |

---

## 2. Voraussetzungen

- Node.js **≥ 18**
- npm
- Neon-PostgreSQL (oder kompatible Postgres-URL)
- Optional: Vercel-Account zum Deploy

---

## 3. Lokal bauen & starten

```bash
git clone https://github.com/poetic-design-net/read-lane.git
cd read-lane
npm install

cp .env.example .env.local
```

### `.env.local` (Minimum)

```env
DATABASE_URL=postgresql://…neon…/neondb?sslmode=require
SESSION_SECRET=mindestens-32-zeichen-zufaellig
NEXT_PUBLIC_APP_URL=http://localhost:3000
NEXT_PUBLIC_APP_NAME=Readlane
```

Secret erzeugen:

```bash
openssl rand -base64 48
```

### Datenbank

```bash
npm run db:push
# optional Admin anlegen:
npm run db:admin
# optional Demo-Seed:
# npm run db:seed
```

### Dev-Server

```bash
npm run dev
```

Öffnen:

- Landing: http://localhost:3000  
- Login: http://localhost:3000/login  
- Dashboard: http://localhost:3000/dashboard  

### Production-Build lokal prüfen

```bash
npm run typecheck
npm test
npm run build
npm start
```

---

## 4. Auf Vercel hochladen (Deploy)

### 4.1 Projekt anbinden

1. [vercel.com/new](https://vercel.com/new) → Repo **poetic-design-net/read-lane** importieren  
2. Framework: **Next.js** (automatisch)  
3. Root: Repository-Root (kein Unterordner)

### 4.2 Environment Variables in Vercel

| Variable | Beispiel | Pflicht |
| --- | --- | --- |
| `DATABASE_URL` | Neon Connection String | ja |
| `SESSION_SECRET` | langer Zufallsstring | ja |
| `NEXT_PUBLIC_APP_URL` | `https://read-lane.vercel.app` | ja (**ohne** Slash am Ende) |
| `NEXT_PUBLIC_APP_NAME` | `Readlane` | nein |

Optional später: Stripe, Blob-Storage – siehe [`.env.example`](../.env.example).

> **Wichtig:** `NEXT_PUBLIC_APP_URL` **ohne** trailing slash, sonst können CLI-Links `//cli/authorize` erzeugen.

### 4.3 Deploy

- Push auf `main` → Vercel baut automatisch  
- Oder: Vercel Dashboard → **Redeploy**

### 4.4 Nach dem Deploy

1. https://read-lane.vercel.app → Landing  
2. https://read-lane.vercel.app/register oder `/login`  
3. Dokument unter `/create` veröffentlichen  
4. Share-Link `/d/…` in privatem Fenster testen  

Neon muss **dieselbe** `DATABASE_URL` wie lokal nutzen, wenn der Admin-User dort angelegt wurde.

---

## 5. Website (Landing) nutzen

**Route:** `/`

- Claim: *Files in. Beautiful pages out.* / *Dokumente schön teilen.*
- CTAs: **Kostenlos veröffentlichen** → Register, **Anmelden** → Login  
- Produkt-Mockup unter `/marketing/product-hero.*`

Anpassen:

- Texte: `src/components/marketing/landing-page.tsx`, `src/lib/brand/config.ts`  
- Logo: `public/brand/`  

---

## 6. App: Dokument teilen (Web)

1. **Registrieren** oder **Anmelden**  
2. `/dashboard` – Free: „Dein kostenloser Link“; Pro/Admin: Projektliste  
3. **Dokument veröffentlichen** → `/create`  
4. Markdown/Text/Code/CSV laden → Einstellungen → **Veröffentlichen**  
5. Share-Link kopieren und teilen  

**Free – ersetzen:** Neues File → Bestätigung → **gleicher** Share-Link, neuer Inhalt.

**Admin-Beispiel (Neon):**

| | |
| --- | --- |
| E-Mail | Konto, das du mit `npm run db:admin` gesetzt hast |
| Plan | `business` + `isAdmin` |

Passwort nur im Terminal-Output des Admin-Skripts (nicht per E-Mail).

---

## 7. CLI installieren & nutzen

### 7.1 Installieren (aus dem Repo)

```bash
cd /pfad/zu/read-lane
npm run cli:build
npm install -g ./packages/cli

# PATH (falls "command not found")
export PATH="$HOME/bin:$HOME/.npm-global/bin:$PATH"
# optional dauerhaft in ~/.zshrc / ~/.bashrc
```

Prüfen:

```bash
readlane --version   # 0.1.0
```

### 7.2 Auf die Live-App zeigen

```bash
export READLANE_API_URL=https://read-lane.vercel.app
```

### 7.3 Login (Device-Flow)

```bash
readlane login
```

1. CLI zeigt **Code** + **Browser-URL**  
2. Browser: bei Readlane einloggen, Code bestätigen  
3. CLI: `✓ Angemeldet`  
4. Token lokal: `~/.config/readlane/credentials.json`  

```bash
readlane whoami
```

### 7.4 Projekt + Push

```bash
cd /pfad/zu/deinem/markdown-projekt
readlane init                 # Projekt wählen oder anlegen
readlane push README.md --open
readlane push --all
readlane status
```

Es entsteht `.readlane.json` (ohne Secrets) mit `projectId` und Datei-Mappings.

### 7.5 CI

```bash
export READLANE_API_URL=https://read-lane.vercel.app
export READLANE_TOKEN=…   # aus Dashboard → CLI-Zugänge
readlane push --all --yes
```

### 7.6 Häufige CLI-Fehler

| Symptom | Ursache | Lösung |
| --- | --- | --- |
| `command not found` | PATH | `export PATH="$HOME/bin:$HOME/.npm-global/bin:$PATH"` |
| `Code: undefined` | alte CLI | `npm run cli:build && npm install -g ./packages/cli` |
| `//cli/authorize` | APP_URL mit `/` | `NEXT_PUBLIC_APP_URL` ohne trailing slash |
| Timeout Login | Browser nicht bestätigt | URL manuell öffnen, eingeloggt sein |

---

## 8. Upload-Wege im Überblick

| Weg | Wie |
| --- | --- |
| **Web** | `/create` – Datei ablegen / einfügen → Veröffentlichen |
| **CLI** | `readlane push datei.md` |
| **API** | `POST /api/v1/…` mit Bearer-Token (siehe [API.md](./API.md)) |

---

## 9. Wichtige Routen (Checkliste)

```
/                      Landing
/login                 Anmelden
/register              Konto erstellen
/dashboard             App-Start
/create                Neu veröffentlichen
/d/{publicId}          Öffentliche Seite
/s/{publicId}          Alias Share
/cli/authorize         CLI freigeben
/dashboard/settings    Konto / CLI-Tokens
/dashboard/upgrade     Pro-Hinweis
```

---

## 10. Entwickler-Befehle

| Befehl | Bedeutung |
| --- | --- |
| `npm run dev` | Dev-Server |
| `npm run build` | Production-Build |
| `npm run start` | Build lokal starten |
| `npm test` | Unit-Tests |
| `npm run typecheck` | TypeScript |
| `npm run db:push` | Schema → Neon |
| `npm run db:admin` | Admin-User upsert |
| `npm run cli:build` | CLI bauen |

---

## 11. Weitere Docs

| Datei | Inhalt |
| --- | --- |
| [README.md](../README.md) | Projekt-Kurzüberblick |
| [API.md](./API.md) | REST-API |
| [backend.md](./backend.md) | Backend-Spec |
| [v2.md](./v2.md) | Produkt-Master (v2) |
| [brand/README.md](./brand/README.md) | Logo / CI |

---

## 12. Schnellcheck „funktioniert alles?“

- [ ] `https://read-lane.vercel.app` lädt (Landing)  
- [ ] `/login` ohne Redirect-Loop  
- [ ] Login mit Konto möglich  
- [ ] Dokument publishen → Share-Link öffnet Inhalt  
- [ ] `readlane --version` im Terminal  
- [ ] `READLANE_API_URL=https://read-lane.vercel.app readlane login` zeigt echten Code  

Bei Fehlern: Vercel Deploy-Log + Browser-Netzwerk + `readlane login` Output mitschicken.
