# Backend-Status (Umsetzung `docs/backend.md` und `docs/v2.md`)

Stand: 2026-08-01

## Architektur

Modulare Services unter `src/lib/` (äquivalent zur packages-Struktur aus der Spec):

| Service | Pfad |
| --- | --- |
| AuthService | `src/lib/auth/service.ts` |
| EntitlementService | `src/lib/plans/service.ts` + `config.ts` |
| BillingService | `src/lib/billing/service.ts` |
| DocumentService | `src/lib/documents/service.ts` |
| DocxConverter | `src/lib/documents/docx.ts` |
| FileService | `src/lib/files/service.ts` |
| StorageService | `src/lib/storage/index.ts` |
| AuditService | `src/lib/audit/service.ts` |
| CliAuthService | `src/lib/cli/tokens.ts` |
| ProjectService | `src/lib/projects/service.ts` + `members.ts` |
| DomainService | `src/lib/domains/service.ts` |
| RateLimit | `src/lib/security/rate-limit.ts` |
| Env validation | `src/lib/env.ts` |
| API envelope | `src/lib/api/errors.ts` |

HTTP nur dünn: Auth → Validate → Service → `apiOk` / `apiError`.

## Datenbank

Neon PostgreSQL + Drizzle.

Kern-Tabellen: `users`, `subscriptions`, `stripe_events`, `projects`, `project_members`, `documents`, `document_versions`, `cli_tokens`, `cli_device_codes`, `password_reset_tokens`, `magic_link_tokens`.

Migration `0001_backend_v2.sql`: `files`, `audit_logs`, `processing_jobs`, `email_verification_tokens`, `document_access_sessions`, `idempotency_keys`, `free_document_selections`, Billing-Felder, `users.public_id` / `avatar_url` / `is_admin`.

Migration `0002_custom_domains.sql`: `custom_domains` (Host, TXT-Token, Verifikation, Branding).

## Tariflogik

Zentral in `planLimits` / `getEntitlements`. Route Handler prüfen **nie** Features selbst.

**Free:** 1 aktiver Slot · kein Projekt · kein Passwort · kein Versions-UI · CLI nur Single-Doc · Share-Link bleibt bei Replace.

**Pro:** Projekte, Passwort, Versionen, Slugs, DOCX, CLI multi, kein Readlane-Branding.

**Business:** zusätzlich Team-Mitglieder, API-Tokens, eigene Domains, Audit Log.

**Downgrade:** `selectFreeDocument` + `applyDowngradeToFree` (idempotent, archiviert Rest).

## Upload-Pipeline

1. Auth + Rate Limit
2. Secret-Dateinamen blocken
3. MIME + Magic Bytes (PDF, Bild, ZIP-Container für DOCX)
4. Entitlements (Renderer, Größe, Storage)
5. DOCX → HTML (mammoth), bevor irgendetwas gespeichert wird
6. Storage put
7. `files`-Row
8. Text extrahieren wo sinnvoll

Storage: `local` (Dev) oder `vercel-blob`. Signierte Lese-URLs über `/api/v1/files/signed`, Content-Type aus der `files`-Row, Inline nur für PDF und Bilder.

## Formate

Markdown, Text, Code, CSV, HTML, PDF, Bilder, DOCX. DOCX wird beim Upload zu HTML konvertiert und beim Rendern durch dasselbe Sanitize-Schema wie Markdown geschickt; eingebettete Bilder entfallen. Tabellen über 500 Zeilen werden gekürzt angezeigt.

## Share-Links

- Canonical: `/s/{shareId}` (= `documents.publicId`)
- Legacy: `/d/{publicId}` (weiter unterstützt)
- Verifizierte eigene Domains liefern dieselben Seiten unter eigenem Host — und nur ihre eigenen Dokumente
- API: `GET /api/v1/shares/:shareId`, unlock

## Teams

`project_members` mit Rollen owner/editor/viewer. Mitglieder werden über die E-Mail eines **bestehenden** Kontos hinzugefügt — es gibt keinen Mailversand, ein Invite-Token hätte keinen Zustellweg. Geteilte Projekte erscheinen in der Projektliste des Mitglieds; Dokumentbearbeitung, Versionen und Management-Links akzeptieren Projekt-Editoren.

## Tokens und Scopes

CLI-Tokens (Device Flow) und API-/CI-Tokens teilen sich `cli_tokens` — die Tabelle enthält alle Spalten, die die Spec für `apiTokens` vorsieht. Scopes werden serverseitig durchgesetzt: `project_read` scheitert an jeder nicht-GET-Methode, projektgebundene Tokens erreichen kein anderes Projekt, kein projektloses Dokument, keine Projekteinstellungen und keine Mitgliederliste.

## Stripe

- Checkout + Customer Portal (SDK)
- Webhook mit Signatur, Idempotenz (`stripe_events`), Upgrade/Downgrade/past_due
- Ohne ENV → 501 (kein Fake-Billing)

## Security

- HttpOnly / Secure / SameSite Session-Cookies
- Passwort-Hashes bcrypt
- Generische Login-Fehler
- Rate Limits (Login, Unlock, Upload, Share)
- Security-Headers + CSP in Middleware
- Keine Secrets in Audit-Metadata
- Plan-Gates serverseitig

## Bewusst nicht gebaut

- **Job-Runner (`processing_jobs`)** — die Tabelle steht, aber es gibt aktuell keinen Job: DOCX konvertiert inline in deutlich unter einer Sekunde. Sobald ein Format das Function-Timeout reißt, kommt der Runner.
- **Preview-/Thumbnail-Generierung** — bräuchte eine Bildbibliothek plus Storage-Pipeline für einen rein kosmetischen Nutzen.
- **Malware-Prüfung** — laut Spec optional, braucht einen externen Scanner.
- **Redis-Rate-Limiter** — In-Process-Zähler reichen für eine Instanz; bei mehreren Instanzen nötig.
- **Argon2id** — aktuell bcrypt, austauschbar hinter `hashSecret`.
- **DB-gestützte Web-Sessions** — aktuell signierte JWT-Cookies, dadurch keine serverseitige Sofort-Invalidierung.
- **Provider-API für Domains** — Verifikation belegt nur den Besitz; DNS-Ziel und Zertifikat liegen beim Hosting.

## Qualitätschecks

```bash
npm run typecheck   # ok
npm run lint        # ok
npm test            # 53 tests
npm run build       # ok
```

Deployment: Vercel + Neon + optional Blob/Stripe. Migrationen bewusst (`db:push` / SQL), nicht pro Request.
