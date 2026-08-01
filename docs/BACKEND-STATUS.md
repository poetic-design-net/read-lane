# Backend-Status (Umsetzung `docs/backend.md`)

Stand: 2026-07-31

## Architektur

Modulare Services unter `src/lib/` (äquivalent zur packages-Struktur aus der Spec):

| Service | Pfad |
| --- | --- |
| AuthService | `src/lib/auth/service.ts` |
| EntitlementService | `src/lib/plans/service.ts` + `config.ts` |
| BillingService | `src/lib/billing/service.ts` |
| DocumentService | `src/lib/documents/service.ts` |
| FileService | `src/lib/files/service.ts` |
| StorageService | `src/lib/storage/index.ts` |
| AuditService | `src/lib/audit/service.ts` |
| CliAuthService | `src/lib/cli/tokens.ts` |
| ProjectService | `src/lib/projects/service.ts` |
| RateLimit | `src/lib/security/rate-limit.ts` |
| Env validation | `src/lib/env.ts` |
| API envelope | `src/lib/api/errors.ts` |

HTTP nur dünn: Auth → Validate → Service → `apiOk` / `apiError`.

## Datenbank

Neon PostgreSQL + Drizzle.

Kern-Tabellen: `users`, `subscriptions`, `stripe_events`, `projects`, `project_members`, `documents`, `document_versions`, `cli_tokens`, `cli_device_codes`, `password_reset_tokens`, `magic_link_tokens`.

Neu (Migration `drizzle/0001_backend_v2.sql`):

- `files`, `audit_logs`, `processing_jobs`
- `email_verification_tokens`, `document_access_sessions`
- `idempotency_keys`, `free_document_selections`
- Billing-Felder an `subscriptions` / `stripe_events`
- `users.public_id`, `avatar_url`, `is_admin`

## Tariflogik

Zentral in `planLimits` / `getEntitlements`. Route Handler prüfen **nie** Features selbst.

**Free:** 1 aktiver Slot · kein Projekt · kein Passwort · kein Versions-UI · CLI nur Single-Doc · Share-Link bleibt bei Replace.

**Pro/Business:** Projekte, Passwort, Versionen, CLI multi, höhere Limits.

**Downgrade:** `selectFreeDocument` + `applyDowngradeToFree` (idempotent, archiviert Rest).

## Upload-Pipeline

1. Auth + Rate Limit  
2. Secret-Dateinamen blocken  
3. MIME + Magic Bytes  
4. Entitlements (Renderer, Größe, Storage)  
5. Storage put  
6. `files`-Row  
7. Text extrahieren wo sinnvoll  

Storage: `local` (Dev) oder `vercel-blob`. Signierte Lese-URLs über `/api/v1/files/signed`.

## Share-Links

- Canonical: `/s/{shareId}` (= `documents.publicId`)
- Legacy: `/d/{publicId}` (weiter unterstützt)
- API: `GET /api/v1/shares/:shareId`, unlock

## Stripe

- Checkout + Customer Portal (SDK)
- Webhook mit Signatur, Idempotenz (`stripe_events`), Upgrade/Downgrade/past_due
- Ohne ENV → 501 (kein Fake-Billing)

## CLI

Device-Code-Flow vorhanden; Token `rln_…` nur gehasht; Free darf nur den einen Slot pushen (Entitlements).

## Security

- HttpOnly / Secure / SameSite Session-Cookies  
- Passwort-Hashes bcrypt  
- Generische Login-Fehler  
- Rate Limits (Login, Unlock, Upload, Share)  
- Security-Headers + CSP in Middleware  
- Keine Secrets in Audit-Metadata  
- Plan-Gates serverseitig  

## Noch später (Spec Phase 6–7, klar markiert)

- Team-Mitglieder UI/Invite-Flow (Schema vorbereitet)
- Custom Domains / Branding
- DOCX-Worker + Job-Runner (Tabelle `processing_jobs` bereit)
- Redis Rate-Limiter
- OpenAPI-YAML-Export
- Argon2id (aktuell bcrypt; austauschbar hinter `hashSecret`)
- DB-backed web sessions (aktuell signierte JWT-Cookies)

## Qualitätschecks

```bash
npm run typecheck   # ok
npm test            # 42 tests
```

Deployment: Vercel + Neon + optional Blob/Stripe. Migrationen bewusst (`db:push` / SQL), nicht pro Request.
