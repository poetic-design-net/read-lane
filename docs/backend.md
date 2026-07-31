# Readlane Backend – vollständiger Master-Prompt

Implementiere das vollständige, produktionsreife Backend für die Web-App **Readlane**.

Readlane verwandelt Markdown, Text, Code, CSV, HTML, PDF, Bilder und später Word-Dokumente in hochwertige, sichere und teilbare Webseiten.

Das Backend muss alle Geschäftsregeln, Datenzugriffe, Datei-Uploads, Authentifizierung, Abrechnung, Share-Links, Tariflimits, Versionen, CLI-Verbindungen und Sicherheitsprüfungen zentral und serverseitig verwalten.

Das Frontend darf niemals selbst entscheiden, auf welche Funktionen ein Nutzer Zugriff hat.

---

# 1. Backend-Ziel

Das Backend muss folgende Kernbereiche vollständig abdecken:

1. Benutzerkonten und Sessions
2. Neon-PostgreSQL-Datenbank
3. Projekte und Dokumente
4. Free-, Pro- und Business-Tarife
5. dauerhaft bestehender Free-Share-Link
6. Upload und Verarbeitung verschiedener Dateiformate
7. sichere Dateispeicherung
8. öffentliche, nicht gelistete und passwortgeschützte Dokumente
9. Dokumentversionen
10. Stripe-Abrechnung
11. CLI- und API-Authentifizierung
12. Konflikterkennung
13. Quoten und Speicherlimits
14. Rate Limiting
15. Audit-, Fehler- und Sicherheitsprotokolle
16. Deployment auf Vercel
17. spätere Hintergrundverarbeitung schwerer Dateiformate

Das Ergebnis muss ohne simulierte Daten, Mock-Endpunkte oder provisorische In-Memory-Lösungen funktionieren.

---

# 2. Verbindlicher Technologie-Stack

Verwende:

* Next.js mit App Router
* TypeScript
* Next.js Route Handler für die HTTP-API
* Server Actions nur für klar abgegrenzte interne Web-Aktionen
* Neon PostgreSQL
* Drizzle ORM
* Zod
* Stripe
* Vercel
* Vercel Blob oder einen kompatiblen S3-/R2-Speicher
* kryptografisch sichere Node.js-APIs
* Argon2id oder einen vergleichbar sicheren Algorithmus für Passwort-Hashes
* eine gepflegte, Next.js-kompatible Authentifizierungslösung
* Vitest oder ein vergleichbares modernes Testsystem

Verwende aktuelle stabile und kompatible Versionen.

Keine Verwendung von:

* SQLite
* Firebase
* Supabase als Datenbank
* MongoDB
* lokalen JSON-Dateien
* In-Memory-Datenbanken
* ungesicherten JWTs im `localStorage`
* selbst erfundenen unsicheren Kryptografie-Verfahren

---

# 3. Projektstruktur

Erstelle eine saubere modulare Struktur.

Empfohlene Struktur:

```text
apps/
  web/
    app/
      api/
        v1/
      s/
      p/
      auth/
    server/

packages/
  auth/
  billing/
  core/
  database/
  documents/
  entitlements/
  files/
  renderers/
  security/
  storage/
  validation/
  observability/
  api-client/
```

Alternativ darf eine vergleichbar klare Struktur verwendet werden.

Geschäftslogik darf nicht direkt über einzelne Route Handler verteilt werden.

Verwende zentrale Services:

```text
AuthService
BillingService
DocumentService
ProjectService
EntitlementService
FileService
StorageService
ShareService
VersionService
CliAuthService
RateLimitService
AuditService
```

Route Handler sollen hauptsächlich:

1. Anfrage authentifizieren
2. Daten validieren
3. Service aufrufen
4. standardisierte Antwort zurückgeben

---

# 4. Umgebungsvariablen

Erstelle eine vollständige `.env.example`.

Mindestens erforderlich:

```env
DATABASE_URL=

SESSION_SECRET=
NEXT_PUBLIC_APP_URL=
NEXT_PUBLIC_APP_NAME=Readlane

STORAGE_PROVIDER=vercel-blob
BLOB_READ_WRITE_TOKEN=

STRIPE_SECRET_KEY=
STRIPE_WEBHOOK_SECRET=
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=

STRIPE_PRO_MONTHLY_PRICE_ID=
STRIPE_PRO_YEARLY_PRICE_ID=
STRIPE_BUSINESS_MONTHLY_PRICE_ID=
STRIPE_BUSINESS_YEARLY_PRICE_ID=

EMAIL_FROM=
EMAIL_PROVIDER_API_KEY=

CLI_DEVICE_CODE_SECRET=
FILE_SIGNING_SECRET=
```

Optional:

```env
SENTRY_DSN=
CRON_SECRET=
INTERNAL_WORKER_SECRET=
```

Anforderungen:

* Alle Variablen zentral validieren.
* Bei fehlenden Pflichtwerten muss die App früh und verständlich fehlschlagen.
* Secrets dürfen niemals im Client-Bundle erscheinen.
* `.env` und `.env.local` müssen durch `.gitignore` ausgeschlossen sein.
* `SESSION_SECRET` muss lang, zufällig und kryptografisch sicher sein.

---

# 5. Datenbank

Verwende ausschließlich Neon PostgreSQL.

Erstelle:

* Drizzle-Schema
* initiale Migrationen
* Migrationsskripte
* Seed-Daten
* Datenbank-Indizes
* eindeutige Constraints
* Foreign Keys
* sinnvolle Löschregeln
* Transaktionen für mehrstufige Aktionen

Erforderliche Skripte:

```json
{
  "scripts": {
    "db:generate": "drizzle-kit generate",
    "db:migrate": "drizzle-kit migrate",
    "db:studio": "drizzle-kit studio",
    "db:seed": "tsx scripts/seed.ts"
  }
}
```

Passe die Befehle an die tatsächliche Implementierung an.

---

# 6. Zentrale Datenbanktabellen

## `users`

```text
id
publicId
email
passwordHash
emailVerifiedAt
displayName
avatarUrl
stripeCustomerId
createdAt
updatedAt
deletedAt
```

Anforderungen:

* E-Mail normalisiert und eindeutig
* interne ID niemals als öffentliche ID verwenden
* Soft Delete für Benutzerkonten
* Passwort-Hash niemals aus der Backend-Schicht herausgeben

---

## `sessions`

Je nach Authentifizierungslösung.

Mindestens:

```text
id
userId
sessionTokenHash
ipHash
userAgent
expiresAt
lastUsedAt
revokedAt
createdAt
```

Session-Token serverseitig nur gehasht speichern.

---

## `emailVerificationTokens`

```text
id
userId
tokenHash
expiresAt
usedAt
createdAt
```

---

## `passwordResetTokens`

```text
id
userId
tokenHash
expiresAt
usedAt
createdAt
```

---

## `subscriptions`

```text
id
userId
plan
status
stripeCustomerId
stripeSubscriptionId
stripePriceId
billingInterval
currentPeriodStart
currentPeriodEnd
cancelAtPeriodEnd
trialEndsAt
createdAt
updatedAt
```

Erlaubte Pläne:

```text
free
pro
business
```

Mögliche Statuswerte:

```text
active
trialing
past_due
canceled
incomplete
unpaid
paused
```

Die lokale Subscription-Tabelle wird ausschließlich über vertrauenswürdige Stripe-Webhooks und klar definierte Backend-Prozesse aktualisiert.

---

## `projects`

```text
id
publicId
ownerId
name
slug
description
defaultVisibility
defaultTheme
defaultContentWidth
defaultFontStyle
createdAt
updatedAt
archivedAt
deletedAt
```

Free-Nutzer dürfen keine Projekte erstellen.

---

## `projectMembers`

```text
id
projectId
userId
role
invitedBy
acceptedAt
createdAt
updatedAt
```

Rollen:

```text
owner
admin
editor
viewer
```

Im ersten MVP kann nur der Eigentümer vollständig genutzt werden. Das Schema muss Teamzugriffe jedoch vorbereiten.

---

## `documents`

```text
id
publicId
ownerId
projectId

title
description
slug

status
visibility
passwordHash

shareId
shareVersion

sourceType
sourcePath
sourceFilename

mimeType
fileExtension
fileSize
rendererType

originalFileId
content
convertedContent
extractedText
contentChecksum

theme
contentWidth
fontStyle
showTableOfContents
showCodeLineNumbers
allowDownload
allowIndexing

currentVersion
lastCliSyncAt

expiresAt
publishedAt
archivedAt
deletedAt

createdAt
updatedAt
```

Erlaubte Statuswerte:

```text
draft
published
archived
```

Erlaubte Sichtbarkeiten:

```text
public
unlisted
password
```

Mögliche Renderer:

```text
markdown
text
code
csv
html
pdf
image
docx
```

`projectId` muss für Free-Dokumente optional sein.

`shareId` muss:

* eindeutig
* lang genug
* nicht sequenziell
* kryptografisch zufällig
* nicht aus Dokument- oder Nutzer-ID ableitbar

sein.

---

## `files`

```text
id
publicId
ownerId
documentId

storageProvider
storageKey
originalFilename
safeFilename
mimeType
fileExtension
fileSize
checksum

uploadStatus
scanStatus

createdAt
deletedAt
```

Mögliche Upload-Statuswerte:

```text
pending
uploaded
processing
ready
failed
deleted
```

Mögliche Scan-Statuswerte:

```text
pending
clean
rejected
not_required
```

---

## `documentVersions`

```text
id
documentId
version

title
description
content
convertedContent
extractedText
contentChecksum

fileId
rendererType
source
createdByUserId
createdByCliTokenId

createdAt
```

Quellen:

```text
web
cli
api
import
restore
```

Erzeuge einen eindeutigen Index auf:

```text
documentId + version
```

---

## `documentAccessSessions`

Für passwortgeschützte Dokumente:

```text
id
documentId
sessionTokenHash
ipHash
expiresAt
revokedAt
createdAt
lastUsedAt
```

---

## `cliDevices`

```text
id
publicId
userId
name
deviceName
operatingSystem
createdAt
lastUsedAt
revokedAt
```

---

## `cliTokens`

```text
id
publicId
userId
cliDeviceId
tokenHash
scopes
expiresAt
lastUsedAt
revokedAt
createdAt
```

---

## `cliDeviceCodes`

Für den Browser-Login des CLI:

```text
id
deviceCodeHash
userCodeHash
status
userId
expiresAt
approvedAt
consumedAt
createdAt
```

Status:

```text
pending
approved
denied
consumed
expired
```

---

## `apiTokens`

Für Business- und CI/CD-Zugriffe:

```text
id
publicId
userId
projectId
name
tokenHash
scopes
expiresAt
lastUsedAt
revokedAt
createdAt
```

---

## `stripeEvents`

```text
id
stripeEventId
eventType
payloadHash
status
processedAt
errorMessage
createdAt
```

`stripeEventId` muss eindeutig sein.

---

## `auditLogs`

```text
id
userId
projectId
documentId
actorType
actorId
action
metadata
ipHash
createdAt
```

Keine Klartext-Secrets in `metadata` speichern.

---

## `rateLimitEvents`

Nur falls ein datenbankbasierter Rate Limiter verwendet wird:

```text
id
keyHash
action
windowStart
requestCount
expiresAt
```

Eine externe Redis-kompatible Lösung darf alternativ verwendet werden.

---

## `processingJobs`

Für spätere schwere Dateiverarbeitung:

```text
id
type
documentId
fileId
status
attempts
maxAttempts
payload
errorMessage
lockedAt
startedAt
completedAt
createdAt
updatedAt
```

Status:

```text
pending
processing
completed
failed
canceled
```

---

# 7. Entitlement- und Tarifservice

Implementiere einen zentralen `EntitlementService`.

Tarifregeln dürfen nicht über Route Handler, Frontend-Komponenten oder Stripe-Namen verteilt werden.

Beispiel:

```ts
type Entitlements = {
  maxActiveDocuments: number | null
  maxProjects: number | null
  maxFileSizeBytes: number
  maxStorageBytes: number

  passwordProtection: boolean
  versionHistory: boolean
  customSlugs: boolean
  customDomains: boolean
  removeBranding: boolean
  cliSingleDocument: boolean
  cliProjects: boolean
  cliPushAll: boolean
  apiAccess: boolean
  teamMembers: boolean

  allowedRendererTypes: string[]
}
```

`null` bedeutet unbegrenzt.

Erstelle zentrale Methoden:

```text
getEntitlements(userId)
assertCanCreateProject(userId)
assertCanCreateDocument(userId)
assertCanUseRenderer(userId, rendererType)
assertCanUsePasswordProtection(userId)
assertCanUseCliProjectSync(userId)
assertWithinStorageLimit(userId, additionalBytes)
```

Jede schreibende Aktion muss vor der Ausführung serverseitig geprüft werden.

---

# 8. Free-Tarif – verbindliche Backend-Logik

Free besitzt:

* genau einen aktiven Dokument-Slot
* kein Projekt
* genau einen dauerhaft bestehenden Share-Link
* unbegrenzt viele Aktualisierungen
* öffentlich oder nicht gelistet
* kein Passwortschutz
* keinen nutzbaren Versionsverlauf
* kein Multi-Dokument-CLI
* kein `push --all`

## Erstellen des ersten Free-Dokuments

Beim ersten Upload:

1. Prüfen, dass der Nutzer Free ist.
2. Prüfen, dass kein aktives Free-Dokument existiert.
3. Neuen zufälligen `shareId` erzeugen.
4. Dokument speichern.
5. Dokument veröffentlichen.
6. Share-Link zurückgeben.

## Ersetzen des Free-Dokuments

Beim späteren Upload:

1. Aktuelles Free-Dokument in einer Transaktion sperren.
2. Neue Datei validieren.
3. Neue Datei vollständig hochladen und verarbeiten.
4. Erst nach erfolgreicher Verarbeitung Dokumentinhalt austauschen.
5. Bestehenden `shareId` unverändert behalten.
6. `publicId` und Share-Link unverändert behalten.
7. Alte Datei nach erfolgreicher Umschaltung zur Löschung markieren.
8. Bei Fehlern die bisherige Version weiter ausliefern.
9. Keine halbfertige Version veröffentlichen.

Der Share-Link darf sich nicht ändern.

Beispiel:

```text
Vorher:
https://readlane.app/s/8kf3mq

Nach dem Ersetzen:
https://readlane.app/s/8kf3mq
```

## Atomarer Austausch

Die neue Datei darf erst öffentlich sichtbar werden, wenn:

* Upload abgeschlossen
* MIME-Type validiert
* Dateigröße geprüft
* Konvertierung erfolgreich
* Inhalt sicher bereinigt
* Datenbanktransaktion erfolgreich

ist.

## Free-Versionsverlauf

Für Free:

* keine Oberfläche für ältere Versionen
* keine Restore-Funktion
* vorherige Version nicht dauerhaft als Produktleistung speichern
* optional maximal kurze technische Rückfallfrist
* technische Rückfallkopien automatisch löschen

---

# 9. Pro- und Business-Logik

Pro und Business dürfen:

* mehrere Dokumente
* Projekte
* individuelle Share-Links
* Passwortschutz
* Versionsverlauf
* eigene Slugs
* CLI-Projektsynchronisierung
* mehrere Datei-Renderer

nutzen.

Bei jeder neuen Dokumentversion:

1. aktuelle Version prüfen
2. Prüfsumme vergleichen
3. unveränderte Inhalte nicht erneut speichern
4. bestehende Version in `documentVersions` sichern
5. aktuelle Version atomar erhöhen
6. Audit Log schreiben

---

# 10. Downgrade von Pro auf Free

Beim Downgrade:

1. Subscription bleibt bis `currentPeriodEnd` aktiv.
2. Nutzer darf bis dahin Pro-Funktionen verwenden.
3. Nutzer kann ein Dokument als zukünftiges Free-Dokument auswählen.
4. Nach Periodenende wird genau dieses Dokument aktiv gehalten.
5. Alle weiteren Dokumente werden archiviert.
6. Projekte werden archiviert oder schreibgeschützt.
7. Share-Links archivierter Dokumente liefern keine Inhalte mehr aus.
8. Archivierte Daten werden nicht sofort gelöscht.
9. Bei erneutem Upgrade können sie reaktiviert werden.

Wenn der Nutzer kein Dokument auswählt:

* wähle das zuletzt aktive veröffentlichte Dokument,
* dokumentiere die Auswahl,
* informiere den Nutzer.

Die Downgrade-Verarbeitung muss idempotent sein.

---

# 11. Authentifizierung

Implementiere:

* Registrierung
* Login
* Logout
* E-Mail-Verifizierung
* Passwort-Reset
* sichere Session-Cookies
* Session-Widerruf
* Konto-Löschung
* optional Magic Link

Cookie-Anforderungen:

```text
HttpOnly
Secure in Produktion
SameSite=Lax oder Strict
begrenzte Laufzeit
Rotation nach sicherheitsrelevanten Aktionen
```

Passwortanforderungen:

* Mindestlänge
* keine Speicherung im Klartext
* Argon2id bevorzugen
* Login-Rate-Limit
* generische Login-Fehler
* keine Information, ob eine E-Mail existiert

Nach Passwortänderung:

* bestehende Sessions widerrufen oder explizite Auswahl anbieten
* CLI-Tokens optional ebenfalls widerrufen

---

# 12. Autorisierung

Jeder Zugriff muss serverseitig autorisiert werden.

Implementiere Funktionen wie:

```text
requireUser()
requireProjectRole(projectId, role)
requireDocumentAccess(documentId, operation)
requirePlanFeature(feature)
```

Regeln:

* Nutzer darf nur eigene oder freigegebene Projekte sehen.
* Viewer darf nichts verändern.
* Editor darf Dokumente bearbeiten, aber keine Abrechnung verwalten.
* Admin darf Mitglieder verwalten.
* Owner darf das Projekt löschen.
* Free-Dokumente gehören direkt dem Nutzer.
* Kenntnis einer `publicId` reicht niemals für Verwaltungszugriff.

---

# 13. Datei-Upload

Implementiere einen sicheren Upload-Prozess.

## Upload-Ablauf

1. Upload-Anfrage authentifizieren.
2. Tarif und Dateigrößenlimit prüfen.
3. Dateiname bereinigen.
4. Dateiendung prüfen.
5. MIME-Type prüfen.
6. Magic Bytes prüfen, wenn möglich.
7. Upload-Intent erstellen.
8. Datei direkt in privaten Object Storage hochladen.
9. Upload serverseitig bestätigen.
10. Prüfsumme berechnen oder validieren.
11. Renderer bestimmen.
12. sichere Verarbeitung ausführen.
13. Dokument erst danach auf `ready` setzen.

## Niemals vertrauen auf:

* Dateiendung allein
* `Content-Type` des Browsers allein
* Originaldateiname
* vom Client gemeldete Dateigröße allein

## Dateinamen

Speichere:

* Originaldateiname für Anzeige
* bereinigten Dateinamen
* internen zufälligen Storage-Key

Beispiel:

```text
users/{userPublicId}/documents/{documentPublicId}/{filePublicId}
```

Keine privaten E-Mail-Adressen in Storage-Keys.

---

# 14. Dateigrößen und Limits

Alle Limits zentral konfigurieren.

Beispiel:

```ts
export const planLimits = {
  free: {
    maxActiveDocuments: 1,
    maxProjects: 0,
    maxFileSizeBytes: 10 * 1024 * 1024,
    maxStorageBytes: 25 * 1024 * 1024
  },
  pro: {
    maxActiveDocuments: null,
    maxProjects: null,
    maxFileSizeBytes: 100 * 1024 * 1024,
    maxStorageBytes: 10 * 1024 * 1024 * 1024
  },
  business: {
    maxActiveDocuments: null,
    maxProjects: null,
    maxFileSizeBytes: 500 * 1024 * 1024,
    maxStorageBytes: 100 * 1024 * 1024 * 1024
  }
}
```

Diese Werte sind als konfigurierbare Ausgangswerte zu behandeln.

Prüfe Limits:

* vor Erstellung eines Upload-Intents
* nach tatsächlichem Upload
* bei Ersetzung
* bei Versionsspeicherung
* bei Team-Uploads

---

# 15. Storage-Abstraktion

Erstelle ein Interface:

```ts
interface StorageProvider {
  createUploadUrl(input): Promise<UploadIntent>
  confirmUpload(input): Promise<StoredFile>
  getSignedReadUrl(key, expiresIn): Promise<string>
  deleteFile(key): Promise<void>
  fileExists(key): Promise<boolean>
}
```

Implementiere mindestens einen Provider.

Bevorzugt:

```text
Vercel Blob
```

Architektur muss später unterstützen:

```text
Amazon S3
Cloudflare R2
Backblaze B2
```

Dateien grundsätzlich privat speichern.

Öffentliche Dokumentseiten erhalten:

* kurzlebige signierte URLs
* oder einen kontrollierten Backend-Proxy

Originaldateien dürfen nicht allein durch Kenntnis des Storage-Keys abrufbar sein.

---

# 16. Format- und Renderer-Pipeline

Implementiere eine zentrale Renderer-Erkennung.

```ts
type RendererType =
  | "markdown"
  | "text"
  | "code"
  | "csv"
  | "html"
  | "pdf"
  | "image"
  | "docx"
```

Methode:

```text
detectRenderer(filename, mimeType, magicBytes)
```

Die Erkennung darf sich nicht nur auf die Endung verlassen.

---

## Markdown

Verarbeitung:

* GFM
* Tabellen
* Checklisten
* Fußnoten
* sichere Links
* sichere Bilder
* Codeblöcke
* Inhaltsverzeichnis
* Heading-IDs

Verboten:

* Skripte
* Event-Handler
* nicht erlaubte Iframes
* `javascript:`-Links
* ausführbare MDX-Komponenten

Speichere nach Möglichkeit:

* Original-Markdown
* sicher konvertierte Darstellung
* extrahierte Überschriften
* Inhaltsverzeichnis

---

## MDX

MDX wird nur als Markdown-Erweiterung behandelt.

Nicht erlauben:

```text
import
export
React-Komponenten
JSX-Ausführung
Server-Code
Client-Code
```

Falls sichere MDX-Verarbeitung nicht zuverlässig möglich ist, behandle `.mdx` wie normales Markdown und entferne ausführbare Syntax.

---

## Text

* Encoding erkennen
* UTF-8 normalisieren
* keine Binärdateien als Text interpretieren
* Größenlimit für direkt gespeicherten Text

---

## Code

* niemals ausführen
* keine Sandbox-Ausführung
* nur Darstellung
* Sprache anhand Endung und MIME-Type erkennen
* Syntax-Highlighting serverseitig oder sicher clientseitig
* geheime Dateitypen standardmäßig blockieren

Blockierte Standardmuster:

```text
.env
.env.*
*.pem
*.key
id_rsa
id_ed25519
credentials.json
service-account*.json
```

Ausnahme nur nach deutlicher Warnung und expliziter Bestätigung. Für das MVP solche Dateien vollständig ablehnen.

---

## CSV

* sichere Parser-Limits
* maximale Zeilenanzahl
* maximale Spaltenanzahl
* Schutz vor übermäßig großen Feldern
* keine CSV-Formeln im Browser ausführen
* beim Download vor Formula Injection warnen oder Inhalte entschärfen

---

## HTML

HTML konsequent sanitizen.

Entfernen:

```text
script
style mit gefährlichen URLs
iframe
object
embed
form
input
button mit Aktionen
Event-Handler
javascript:-Links
data:text/html
unsichere SVG-Inhalte
```

Externe Ressourcen standardmäßig blockieren oder über eine Allowlist kontrollieren.

Biete zwei Modi:

```text
sanitized-document
source-code
```

---

## PDF

PDF nicht serverseitig ausführen oder verändern.

Backend-Aufgaben:

* MIME-Type und Magic Bytes prüfen
* private Speicherung
* Metadaten extrahieren, wenn sicher
* signierte URL für Viewer bereitstellen
* Download-Berechtigung prüfen
* Range Requests unterstützen, falls der Storage-Provider dies ermöglicht

---

## Bilder

Unterstütze:

```text
png
jpeg
webp
gif
```

Prüfe:

* tatsächliches Bildformat
* Pixelabmessungen
* Dateigröße
* Dekompressionsgröße

SVG nur nach strenger Sanitization oder im MVP ablehnen.

---

## DOCX

DOCX gehört zur zweiten Phase.

Architektur vorbereiten:

1. Datei speichern.
2. Processing Job erstellen.
3. Dokumentstatus auf `processing`.
4. Worker konvertiert DOCX.
5. Ergebnis sanitizen.
6. Vorschau bereitstellen.
7. Dokument auf `ready` setzen.

DOCX niemals ungeprüft als HTML übernehmen.

---

# 17. Hintergrundverarbeitung

Das MVP soll leichte Formate direkt verarbeiten können.

Leicht:

* Markdown
* Text
* Code
* kleinere CSV
* HTML-Sanitizing
* Bildmetadaten

Schwer:

* DOCX-Konvertierung
* große CSV-Dateien
* Vorschaubilder
* PDF-Metadaten
* Virenscan
* komplexe Textextraktion

Für schwere Verarbeitung:

* `processingJobs` verwenden
* Job-Handler idempotent gestalten
* maximale Wiederholungen
* exponentielles Backoff
* Dead-Letter-Zustand
* Fehler im Dashboard sichtbar machen

Die Job-Infrastruktur muss austauschbar sein.

Mögliche spätere Anbieter:

* Inngest
* Trigger.dev
* QStash
* eigener Worker

Das Backend darf nicht voraussetzen, dass lange Konvertierungen innerhalb einer normalen HTTP-Anfrage abgeschlossen werden.

---

# 18. Share-Links

Standardformat:

```text
https://readlane.app/s/{shareId}
```

Projektbasierte schöne URL optional:

```text
https://readlane.app/p/{projectSlug}/{documentSlug}
```

Die schöne URL darf intern auf das Dokument zeigen.

Der echte Zugriff wird immer serverseitig geprüft.

## Öffentlicher Zugriff

Prüfen:

1. Dokument vorhanden
2. nicht gelöscht
3. Status `published`
4. nicht archiviert
5. nicht abgelaufen
6. Sichtbarkeit erlaubt
7. Passwortsession vorhanden, falls nötig

## Nicht vorhandene Dokumente

Keine internen Details ausgeben.

Standardisierte neutrale Antwort:

```text
Dieses Dokument ist nicht verfügbar.
```

---

# 19. Passwortschutz

Passwortschutz nur für berechtigte Tarife.

Beim Setzen:

1. Entitlement prüfen.
2. Passwort validieren.
3. sicheren Hash erzeugen.
4. Klartext sofort verwerfen.
5. Sichtbarkeit auf `password` setzen.
6. bestehende Access Sessions widerrufen.

Beim Entsperren:

1. Rate Limit prüfen.
2. Passwort-Hash vergleichen.
3. bei Erfolg zufälliges Access-Token erzeugen.
4. nur Token-Hash speichern.
5. HTTP-only Cookie setzen.
6. Token an genau ein Dokument binden.
7. Ablaufzeit setzen.

Cookie darf keine Klartext-Dokumentpasswörter enthalten.

---

# 20. Ablaufdaten

Bei jedem öffentlichen Zugriff prüfen:

```text
expiresAt === null
oder
expiresAt > now()
```

Abgelaufene Dokumente:

* keine Inhalte ausliefern
* keine signierten Datei-URLs erzeugen
* neutrale Ablaufseite liefern
* Eigentümer darf sie weiterhin im Dashboard sehen
* Reaktivierung nur bei berechtigtem Tarif

---

# 21. Dokumentversionen

Nur Pro und Business erhalten zugängliche Versionen.

## Neue Version erzeugen

1. Dokumentzeile sperren.
2. erwartete Basisversion prüfen.
3. Prüfsumme vergleichen.
4. bei identischem Inhalt abbrechen.
5. aktuelle Version in `documentVersions` speichern.
6. neue aktuelle Version schreiben.
7. Versionsnummer erhöhen.
8. Audit Log schreiben.
9. Transaktion abschließen.

## Konflikterkennung

CLI oder API sendet:

```json
{
  "baseVersion": 6,
  "contentChecksum": "..."
}
```

Remote-Version ist beispielsweise:

```text
7
```

Antwort:

```json
{
  "error": {
    "code": "DOCUMENT_CONFLICT",
    "message": "The document was modified remotely.",
    "details": {
      "remoteVersion": 7,
      "localBaseVersion": 6
    }
  }
}
```

HTTP-Status:

```text
409 Conflict
```

Optional zusätzlich `ETag` und `If-Match` unterstützen.

---

# 22. CLI-Authentifizierung

Implementiere einen sicheren Device-Code-Flow.

Ablauf:

1. CLI fordert Device Code an.
2. Backend gibt:

   * `deviceCode`
   * kurzen `userCode`
   * Bestätigungs-URL
   * Ablaufzeit
   * Polling-Intervall
3. Nutzer öffnet Browser.
4. Nutzer meldet sich an.
5. Nutzer bestätigt das Gerät.
6. CLI pollt mit `deviceCode`.
7. Nach Bestätigung erhält CLI einmalig einen Zugriffstoken.
8. Backend speichert nur den Token-Hash.
9. Device Code wird als verbraucht markiert.

Beispiel:

```text
Open:
https://readlane.app/cli/activate

Enter code:
RLN-7K3P
```

Token-Anforderungen:

* mindestens 256 Bit Entropie
* Präfix zur Erkennung, beispielsweise `rln_cli_`
* nur einmal vollständig anzeigen
* serverseitig nur gehasht speichern
* widerrufbar
* optional ablaufend
* Scopes besitzen
* letzte Nutzung speichern

Mögliche Scopes:

```text
documents:read
documents:write
projects:read
projects:write
versions:read
```

---

# 23. Free-CLI

Free darf optional genau den einen Publishing-Slot aktualisieren.

Erlaubt:

```bash
readlane login
readlane whoami
readlane push README.md
readlane open
```

Nicht erlaubt:

```bash
readlane init
readlane projects
readlane push --all
readlane archive
mehrere Dokumentzuordnungen
```

`readlane push DATEI` ersetzt beziehungsweise aktualisiert das eine aktive Free-Dokument.

Der bestehende Share-Link bleibt unverändert.

---

# 24. Pro- und Business-CLI

Erlaubt:

```bash
readlane init
readlane projects
readlane push
readlane push --all
readlane status
readlane diff
readlane pull
readlane archive
readlane open
```

Jeder CLI-Push muss:

* Token prüfen
* Scope prüfen
* Tarif prüfen
* Projektzugriff prüfen
* Dateityp prüfen
* Speicherlimit prüfen
* Konflikte prüfen
* Audit Log schreiben

---

# 25. API-Versionierung

Alle öffentlichen API-Endpunkte unter:

```text
/api/v1
```

Keine unversionierten CLI- oder Integrationsendpunkte.

---

# 26. Standardisiertes Antwortformat

Erfolg:

```json
{
  "data": {},
  "meta": {
    "requestId": "req_..."
  }
}
```

Fehler:

```json
{
  "error": {
    "code": "PLAN_LIMIT_REACHED",
    "message": "Your current plan does not allow another active document.",
    "details": {}
  },
  "meta": {
    "requestId": "req_..."
  }
}
```

Keine Stacktraces oder SQL-Details im Client ausgeben.

---

# 27. Fehlercodes

Mindestens:

```text
UNAUTHENTICATED
UNAUTHORIZED
VALIDATION_ERROR
RESOURCE_NOT_FOUND
DOCUMENT_CONFLICT
DOCUMENT_EXPIRED
DOCUMENT_ARCHIVED
INVALID_PASSWORD
RATE_LIMITED
PLAN_LIMIT_REACHED
FEATURE_NOT_AVAILABLE
STORAGE_LIMIT_REACHED
FILE_TOO_LARGE
UNSUPPORTED_FILE_TYPE
INVALID_FILE_CONTENT
UPLOAD_FAILED
PROCESSING_FAILED
SUBSCRIPTION_REQUIRED
STRIPE_ERROR
INTERNAL_ERROR
```

---

# 28. API-Endpunkte – Auth

```text
POST   /api/v1/auth/register
POST   /api/v1/auth/login
POST   /api/v1/auth/logout
POST   /api/v1/auth/verify-email
POST   /api/v1/auth/request-password-reset
POST   /api/v1/auth/reset-password
GET    /api/v1/auth/sessions
DELETE /api/v1/auth/sessions/:id
```

Falls die Authentifizierungsbibliothek eigene Routen bereitstellt, müssen dennoch dieselben Sicherheits- und Produktanforderungen erfüllt werden.

---

# 29. API-Endpunkte – Account und Plan

```text
GET    /api/v1/account
PATCH  /api/v1/account
DELETE /api/v1/account

GET    /api/v1/plans
GET    /api/v1/entitlements
GET    /api/v1/usage
```

`usage` liefert:

```json
{
  "activeDocuments": 1,
  "projects": 0,
  "storageBytes": 248120,
  "maxStorageBytes": 26214400
}
```

---

# 30. API-Endpunkte – Billing

```text
POST /api/v1/billing/checkout
POST /api/v1/billing/portal
GET  /api/v1/billing/subscription
POST /api/v1/billing/select-free-document
POST /api/v1/webhooks/stripe
```

Webhook-Endpunkt darf keine normale Session-Authentifizierung verwenden.

Er muss ausschließlich die Stripe-Signatur prüfen.

---

# 31. API-Endpunkte – Projekte

```text
GET    /api/v1/projects
POST   /api/v1/projects
GET    /api/v1/projects/:projectId
PATCH  /api/v1/projects/:projectId
DELETE /api/v1/projects/:projectId

GET    /api/v1/projects/:projectId/documents
GET    /api/v1/projects/:projectId/members
POST   /api/v1/projects/:projectId/members
PATCH  /api/v1/projects/:projectId/members/:memberId
DELETE /api/v1/projects/:projectId/members/:memberId
```

Free erhält bei Projektaktionen:

```text
FEATURE_NOT_AVAILABLE
```

---

# 32. API-Endpunkte – Dokumente

```text
GET    /api/v1/documents
POST   /api/v1/documents
GET    /api/v1/documents/:documentId
PATCH  /api/v1/documents/:documentId
DELETE /api/v1/documents/:documentId

POST   /api/v1/documents/:documentId/publish
POST   /api/v1/documents/:documentId/archive
POST   /api/v1/documents/:documentId/restore
POST   /api/v1/documents/:documentId/replace

POST   /api/v1/documents/:documentId/password
DELETE /api/v1/documents/:documentId/password

POST   /api/v1/documents/:documentId/rotate-share-link
POST   /api/v1/documents/:documentId/management-url
```

`replace` muss beim Free-Tarif den bestehenden Link erhalten.

---

# 33. API-Endpunkte – Uploads

```text
POST /api/v1/uploads/intents
POST /api/v1/uploads/:uploadId/confirm
GET  /api/v1/uploads/:uploadId
DELETE /api/v1/uploads/:uploadId
```

Upload Intent enthält nur zeitlich begrenzte Informationen.

---

# 34. API-Endpunkte – Versionen

```text
GET  /api/v1/documents/:documentId/versions
GET  /api/v1/documents/:documentId/versions/:version
POST /api/v1/documents/:documentId/versions/:version/restore
GET  /api/v1/documents/:documentId/diff
```

Free erhält:

```text
FEATURE_NOT_AVAILABLE
```

---

# 35. API-Endpunkte – öffentliche Freigaben

```text
GET  /api/v1/shares/:shareId
POST /api/v1/shares/:shareId/unlock
POST /api/v1/shares/:shareId/lock
GET  /api/v1/shares/:shareId/file
```

Die öffentliche Dokumentseite darf alternativ serverseitig direkt auf Services zugreifen. Die Zugriffskontrollen müssen identisch sein.

---

# 36. API-Endpunkte – CLI

```text
POST   /api/v1/cli/device
POST   /api/v1/cli/device/token
POST   /api/v1/cli/device/approve
POST   /api/v1/cli/device/deny

GET    /api/v1/cli/devices
DELETE /api/v1/cli/devices/:deviceId

GET    /api/v1/cli/projects
GET    /api/v1/cli/documents/:documentId
PUT    /api/v1/cli/documents/:documentId
POST   /api/v1/cli/documents
```

---

# 37. Stripe

Implementiere:

* Checkout für Pro monatlich
* Checkout für Pro jährlich
* Checkout für Business monatlich
* Checkout für Business jährlich
* Customer Portal
* Kündigung zum Periodenende
* Reaktivierung
* Upgrade
* Downgrade
* Webhook-Verarbeitung

Mindestens relevante Webhook-Ereignisse:

```text
checkout.session.completed
customer.subscription.created
customer.subscription.updated
customer.subscription.deleted
invoice.paid
invoice.payment_failed
```

Webhook-Ablauf:

1. Raw Body erhalten.
2. Stripe-Signatur prüfen.
3. Event-ID auf Duplikat prüfen.
4. Event als `processing` speichern.
5. Transaktion ausführen.
6. Event als `processed` markieren.
7. Bei Fehler als `failed` markieren.
8. Wiederholung sicher zulassen.

Keine alleinige Abhängigkeit von der Rückleitung nach Stripe Checkout.

---

# 38. Rate Limiting

Rate Limits mindestens für:

* Login
* Registrierung
* Passwort-Reset
* E-Mail-Verifizierung
* Passwortgeschützte Dokumente
* CLI Device Flow
* Upload Intent
* Datei-Bestätigung
* öffentliche Share-Endpunkte
* API-Tokens
* Stripe-Checkout-Erstellung

Schlüssel können kombinieren:

```text
IP-Hash
User-ID
Dokument-ID
CLI-Token-ID
Aktion
```

Fehler:

```text
429 Too Many Requests
```

Mit sinnvoller `Retry-After`-Information.

---

# 39. Sicherheitsheader

Setze:

```text
Content-Security-Policy
X-Content-Type-Options: nosniff
Referrer-Policy
Permissions-Policy
Strict-Transport-Security in Produktion
Frame-Ancestors oder X-Frame-Options
```

CSP so konfigurieren, dass hochgeladene Inhalte keine Skripte ausführen können.

---

# 40. CSRF

Schreibende Web-Aktionen müssen gegen CSRF geschützt sein.

API-Tokens und CLI-Tokens verwenden keine Cookie-Session und benötigen stattdessen:

* Bearer Token
* Origin-unabhängige Token-Authentifizierung
* keine Cookie-Abhängigkeit

Cookie-basierte Endpunkte:

* Origin prüfen
* SameSite-Cookies
* CSRF-Token oder Framework-Schutz verwenden

---

# 41. Logging und Observability

Jede Anfrage erhält eine `requestId`.

Logge strukturiert:

```text
requestId
route
method
status
duration
actorType
userPublicId
documentPublicId
projectPublicId
errorCode
```

Nicht loggen:

* Passwörter
* Session-Tokens
* CLI-Tokens
* API-Tokens
* Stripe-Secrets
* vollständige private Dokumentinhalte
* signierte Datei-URLs
* Passwort-Hashes

Fehlertracking darf optional über Sentry erfolgen.

---

# 42. Audit Logs

Audit-Ereignisse mindestens für:

```text
user.login
user.password_changed
user.account_deleted

subscription.upgraded
subscription.downgraded
subscription.canceled

project.created
project.updated
project.archived
project.deleted

document.created
document.updated
document.replaced
document.published
document.archived
document.restored
document.deleted
document.password_enabled
document.password_disabled
document.share_link_rotated

cli.device_approved
cli.device_revoked
api_token.created
api_token.revoked
```

---

# 43. Datenschutz und Löschung

## Dokument löschen

1. Dokument auf `deletedAt` setzen.
2. öffentliche Auslieferung sofort stoppen.
3. Dateien zur endgültigen Löschung markieren.
4. Versionen nach definierter Frist löschen.
5. Audit Log behalten, aber ohne Dokumentinhalt.

## Nutzerkonto löschen

1. Sessions widerrufen.
2. CLI- und API-Tokens widerrufen.
3. Subscription behandeln.
4. Dokumente unzugänglich machen.
5. Dateien löschen oder zur Löschung vormerken.
6. personenbezogene Daten anonymisieren oder löschen.
7. gesetzlich notwendige Abrechnungsdaten getrennt behandeln.

Erstelle eine dokumentierte Aufbewahrungsstrategie.

---

# 44. Datenbanktransaktionen

Verwende Transaktionen mindestens für:

* Free-Dokument ersetzen
* Dokumentversion erstellen
* Share-Link rotieren
* Projekt löschen
* Downgrade anwenden
* Stripe-Webhook verarbeiten
* CLI Device Code verbrauchen
* Speicherverbrauch aktualisieren

Verhindere Race Conditions durch:

* Zeilensperren
* eindeutige Constraints
* atomare Updates
* Versionsnummern
* idempotente Requests

---

# 45. Idempotency

Unterstütze `Idempotency-Key` für:

* Dokumenterstellung
* Upload-Bestätigung
* Free-Dokument ersetzen
* Veröffentlichung
* Stripe Checkout
* CLI-Push
* API-Importe

Speichere Schlüssel nur zeitlich begrenzt und an Nutzer plus Operation gebunden.

---

# 46. Performance

Berücksichtige:

* geeignete Indizes
* paginierte Listen
* Cursor-Pagination
* keine unnötigen N+1-Abfragen
* kleine API-Payloads
* keine vollständigen Dokumentinhalte in Dashboard-Listen
* signierte Datei-URLs nur bei Bedarf
* Caching nur für sichere öffentliche Inhalte
* niemals Passwortinhalte öffentlich cachen

Öffentliche Dokumente können anhand von:

```text
documentId
currentVersion
updatedAt
```

gecached werden.

Bei Aktualisierung muss der Cache invalidiert werden.

---

# 47. Datenbankindizes

Erstelle mindestens Indizes für:

```text
users.email
users.publicId

projects.ownerId
projects.publicId
projects.ownerId + slug

documents.ownerId
documents.projectId
documents.publicId
documents.shareId
documents.projectId + slug
documents.status
documents.updatedAt

documentVersions.documentId + version

subscriptions.userId
subscriptions.stripeSubscriptionId

cliTokens.tokenHash
apiTokens.tokenHash

stripeEvents.stripeEventId
```

Nur tatsächlich sinnvolle Indizes erstellen und Migrationen dokumentieren.

---

# 48. Seeds

Erstelle Entwicklungs-Seeds:

Fiktiver Benutzer:

```text
Alex Mercer
alex@readlane.app
```

Projekte:

```text
Northstar Docs
Lumen Studio
Harbor Labs
Field Notes
```

Demo-Dokumente:

```text
README.md
getting-started.md
api-reference.md
architecture.md
changelog.md
faq.md
```

Keine echten Nutzer- oder Kundenprojekte verwenden.

Seed-Passwörter nur für lokale Entwicklung und deutlich kennzeichnen.

---

# 49. Tests

Schreibe Unit-, Integrations- und End-to-End-nahe Backend-Tests.

## Authentifizierung

* Registrierung
* doppelte E-Mail
* Login korrekt
* Login falsch
* Session-Ablauf
* Session-Widerruf
* Passwort-Reset
* Token nur einmal nutzbar

## Free-Tarif

* erstes Dokument kann erstellt werden
* zweites aktives Dokument wird abgelehnt
* bestehendes Dokument kann ersetzt werden
* Share-Link bleibt unverändert
* neue Datei wird erst nach erfolgreicher Verarbeitung sichtbar
* Fehler beim Upload erhält bisheriges Dokument
* kein Projekt möglich
* kein Passwortschutz möglich
* kein Versionsverlauf verfügbar
* CLI kann nur den einen Slot aktualisieren

## Pro

* mehrere Dokumente
* mehrere Projekte
* Passwortschutz
* Versionen
* CLI-Projekt-Push
* `push --all`
* Konflikterkennung

## Dokumentzugriff

* öffentlich
* nicht gelistet
* Passwort korrekt
* Passwort falsch
* Rate Limit
* abgelaufen
* archiviert
* gelöscht

## Uploads

* gültiges Markdown
* falscher MIME-Type
* Datei zu groß
* blockierte Secret-Datei
* gefährliches HTML
* ungültiges Bild
* PDF-Magic-Bytes
* CSV-Limits

## Sicherheit

* XSS
* `javascript:`-Link
* Script-Tag
* Event-Handler
* Path Traversal
* fremder Projektzugriff
* fremder Dokumentzugriff
* gestohlene öffentliche ID ermöglicht keine Bearbeitung

## Stripe

* gültiger Webhook
* ungültige Signatur
* doppeltes Event
* Upgrade
* Kündigung zum Periodenende
* Downgrade
* Zahlung fehlgeschlagen

## CLI

* Device Code
* abgelaufener Code
* doppelte Verwendung
* widerrufenes Gerät
* fehlender Scope
* Konflikt
* idempotenter Push

---

# 50. Qualitätsprüfungen

Vor Abschluss ausführen:

```bash
npm run typecheck
npm run lint
npm run test
npm run build
```

Zusätzlich:

* alle Migrationen auf leerer Datenbank testen
* Seed testen
* Stripe-Webhook lokal testen
* Free-Ersetzungsablauf testen
* CLI Device Flow testen
* Upload-Fehler testen
* Zugriff auf archivierte Dokumente testen

Alle Fehler beheben.

---

# 51. API-Dokumentation

Erstelle eine vollständige Backend-Dokumentation.

Mindestens:

* Authentifizierung
* Session-Modell
* Bearer Tokens
* Scopes
* Endpunkte
* Request- und Response-Schemas
* Fehlercodes
* Rate Limits
* Upload-Ablauf
* CLI Device Flow
* Versionskonflikte
* Stripe-Webhooks
* Tariflimits

Erzeuge optional eine OpenAPI-Spezifikation.

Keine internen Admin-Endpunkte öffentlich dokumentieren.

---

# 52. README

Die README muss erklären:

1. Voraussetzungen
2. Neon-Projekt erstellen
3. `DATABASE_URL` eintragen
4. Object Storage einrichten
5. Stripe-Produkte und Prices anlegen
6. Stripe-Webhooks konfigurieren
7. E-Mail-Anbieter einrichten
8. lokale Entwicklung starten
9. Migrationen ausführen
10. Seeds einspielen
11. Tests ausführen
12. Vercel-Deployment
13. CLI-Authentifizierung
14. Produktions-Secrets verwalten

Grundbefehle:

```bash
npm install
npm run db:generate
npm run db:migrate
npm run db:seed
npm run dev
```

---

# 53. Deployment

Zielplattform:

```text
Vercel
```

Datenbank:

```text
Neon PostgreSQL
```

Storage:

```text
Vercel Blob oder kompatibler privater Object Storage
```

Deployment-Anforderungen:

* Environment Variables getrennt für Preview und Production
* Production-Webhook von Stripe
* sichere Produktions-Cookies
* HTTPS erzwingen
* Datenbankmigration als bewusster Deployment-Schritt
* keine Migration bei jedem normalen Request
* Preview-Deployments dürfen nicht versehentlich Produktions-Webhooks verarbeiten

---

# 54. Backend-Akzeptanzkriterien

Das Backend ist erst abgeschlossen, wenn dieser Ablauf funktioniert:

## Free

1. Nutzer registriert sich.
2. Nutzer verifiziert seine E-Mail.
3. Nutzer lädt `README.md` hoch.
4. Upload wird validiert.
5. Dokument wird verarbeitet.
6. Dokument erhält einen Share-Link.
7. Link liefert die sichere Markdown-Darstellung.
8. Nutzer lädt später `proposal.pdf` hoch.
9. Backend verarbeitet die neue Datei.
10. Free-Dokument wird atomar ersetzt.
11. Der bestehende Share-Link bleibt identisch.
12. Die bisherige Datei wird nicht mehr ausgeliefert.
13. Bei Verarbeitungsfehler bleibt die bisherige Datei sichtbar.
14. Ein zweites aktives Dokument wird abgelehnt.
15. Ein Projekt kann nicht erstellt werden.

## Pro

1. Nutzer schließt Pro ab.
2. Stripe-Webhook aktualisiert den Tarif.
3. Nutzer erstellt ein Projekt.
4. Nutzer erstellt mehrere Dokumente.
5. Jedes Dokument besitzt einen eigenen Link.
6. Passwortschutz funktioniert.
7. Versionen werden gespeichert.
8. CLI Device Flow funktioniert.
9. CLI aktualisiert ein Dokument.
10. Remote-Konflikte erzeugen HTTP 409.
11. Eine ältere Version kann wiederhergestellt werden.

## Downgrade

1. Pro wird zum Periodenende gekündigt.
2. Pro bleibt bis zum Periodenende aktiv.
3. Nutzer wählt sein Free-Dokument.
4. Nach Periodenende bleibt genau dieses Dokument aktiv.
5. Andere Dokumente werden archiviert.
6. Bei erneutem Upgrade können sie reaktiviert werden.

---

# 55. Umsetzungsreihenfolge

## Phase 1 – Fundament

1. Projektstruktur
2. Environment-Validierung
3. Neon und Drizzle
4. Authentifizierung
5. Sessions
6. zentrale Services
7. standardisierte API-Antworten
8. Logging

## Phase 2 – Free-Backend

1. Dokumentmodell
2. Datei-Upload
3. Storage
4. Renderer
5. permanenter Share-Link
6. atomarer Dokumentaustausch
7. öffentliche Auslieferung
8. Free-Tariflimits

## Phase 3 – Billing

1. Stripe-Produkte
2. Checkout
3. Webhooks
4. EntitlementService
5. Upgrade
6. Kündigung
7. Downgrade

## Phase 4 – Pro

1. Projekte
2. mehrere Dokumente
3. Passwortschutz
4. Versionen
5. Slugs
6. Ablaufdaten
7. Archiv

## Phase 5 – CLI

1. Device-Code-Flow
2. CLI-Tokens
3. Scopes
4. Dokument-Push
5. Projekt-Push
6. Konflikterkennung
7. Diff und Pull

## Phase 6 – Business

1. Mitglieder
2. Rollen
3. API-Tokens
4. Audit Logs
5. eigene Domains
6. eigenes Branding

## Phase 7 – Hintergrundjobs

1. Job-System
2. DOCX
3. große CSV
4. Preview-Generierung
5. optionale Malware-Prüfung

---

# 56. Arbeitsanweisung

Implementiere das Backend vollständig und produktionsreif.

Keine Funktionen nur simulieren.

Keine Planprüfung ausschließlich im Frontend durchführen.

Keine Klartext-Secrets speichern.

Keine Uploads ohne serverseitige Prüfung akzeptieren.

Keine Inhalte öffentlich ausliefern, bevor ihre Verarbeitung vollständig erfolgreich war.

Stelle bei kleinen technischen Detailentscheidungen keine unnötigen Rückfragen. Triff nachvollziehbare Entscheidungen und dokumentiere sie.

Am Ende:

* Architektur erklären
* Datenbankschema zusammenfassen
* Services auflisten
* API-Endpunkte auflisten
* Tariflogik erklären
* Upload-Pipeline erklären
* Free-Ersetzungslogik erklären
* Stripe-Integration erklären
* CLI-Authentifizierung erklären
* Sicherheitsmaßnahmen auflisten
* benötigte Environment Variables nennen
* Migrationen und Deployment erklären
* ausgeführte Tests und Prüfungen nennen
* noch nicht umgesetzte spätere Erweiterungen klar kennzeichnen
