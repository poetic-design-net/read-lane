# Readlane API (v1)

Base URL: `{NEXT_PUBLIC_APP_URL}/api/v1`

Machine-readable inventory: [`openapi.yaml`](openapi.yaml).

## Response format

Success:

```json
{
  "data": {},
  "meta": { "requestId": "req_…" }
}
```

Error:

```json
{
  "error": {
    "code": "PLAN_LIMIT_REACHED",
    "message": "…",
    "details": {}
  },
  "meta": { "requestId": "req_…" }
}
```

Header: `x-request-id`

## Authentication

| Mode | How |
| --- | --- |
| Web session | HttpOnly cookie `readlane_session` (after `/api/v1/auth/login`) |
| CLI / CI | `Authorization: Bearer rln_…` |

Sessions are signed JWT cookies (HttpOnly, Secure, SameSite=Lax). Tokens are
stored only as SHA-256 hashes; the plaintext is shown once at creation.

### Token scopes

| Scope | May do |
| --- | --- |
| `full` | everything the user may do |
| `project_write` | read and write inside one project |
| `project_read` | read inside one project — every non-GET request is rejected |

Scope violations return `403 FORBIDDEN`. A project-scoped token cannot reach
another project, a document outside a project, project settings, or the member
list.

### Auth endpoints

| Method | Path | Notes |
| --- | --- | --- |
| POST | `/auth/register` | email, password, name? |
| POST | `/auth/login` | generic errors (no email oracle) |
| POST | `/auth/logout` | clears session |

## Account & plans

| Method | Path |
| --- | --- |
| GET/PATCH/DELETE | `/account` |
| GET | `/me` |
| GET | `/plans` |
| GET | `/entitlements` |
| GET | `/usage` |

## Billing

| Method | Path | Auth |
| --- | --- | --- |
| POST | `/billing/checkout` | session |
| POST | `/billing/portal` | session |
| GET | `/billing/subscription` | session |
| POST | `/billing/select-free-document` | session |
| POST | `/webhooks/stripe` | Stripe signature only |

Webhooks verify the Stripe signature and deduplicate on the event id
(`stripe_events`). Handled: checkout completed, subscription created/updated/
deleted, invoice payment failed → `past_due`. Without Stripe environment
variables the billing endpoints answer `501`, never a fake success.

## Projects

| Method | Path |
| --- | --- |
| GET/POST | `/projects` |
| GET/PATCH/DELETE | `/projects/:projectId` |
| GET/POST | `/projects/:projectId/documents` |
| GET/POST | `/projects/:projectId/members` |
| PATCH/DELETE | `/projects/:projectId/members/:memberId` |

Members are referenced by their membership id. Roles: `owner`, `editor`,
`viewer`; only the owner may change the list, and the invitee needs an existing
account. Free plans get `FEATURE_NOT_AVAILABLE` on project actions, non-Business
plans on member actions.

## Documents

| Method | Path |
| --- | --- |
| GET/POST | `/documents` |
| GET/PUT/DELETE | `/documents/:id` |
| POST | `/documents/:id/publish` |
| POST | `/documents/:id/archive` |
| GET | `/documents/:id/management-url` |
| GET | `/documents/:id/versions` |
| POST | `/documents/:id/versions/:version/restore` |

Free: one active document; `replaceActive: true` keeps `shareId`.

### Version conflicts

`PUT /documents/:id` accepts `baseVersion`. If the stored version differs, the
request fails with `409 DOCUMENT_CONFLICT` and nothing is written. Repeat with
`force: true` to overwrite. Every content change writes a new version row and
increments `version`.

## Uploads

| Method | Path | Body |
| --- | --- | --- |
| POST | `/uploads` | `multipart/form-data`, field `file` |

Order: rate limit → blocked filenames (`.env`, keys, credentials) → MIME and
magic bytes → plan limits (renderer, file size, storage) → object storage →
`files` row → text extraction. DOCX is converted to HTML during the request.
Text formats come back in `content`; PDFs and images come back with a
short-lived `previewUrl`. Publish with `fileId`; storage keys are never accepted
from a request.

Stored files are served through `/files/signed`, which sets the content type
from the `files` row and forces `attachment` for everything except PDF and
images.

## Shares (public)

| Method | Path |
| --- | --- |
| GET | `/shares/:shareId` |
| POST | `/shares/:shareId/unlock` |

Public page: `https://…/s/{shareId}` (alias `/d/{shareId}`). Verified custom
domains serve the same pages under their own host and only for their own
documents.

## CLI device flow

| Method | Path |
| --- | --- |
| POST | `/cli/device` | start: returns `deviceCode`, `userCode`, `verificationUrl`, `interval` |
| POST | `/cli/device/token` | poll with `deviceCode` |
| GET/DELETE | `/cli/token`, `/cli/token/:id` | list and revoke |

Polling answers `PENDING` until the user approves at `/cli/authorize`, then
returns the token once. `DENIED` and `EXPIRED` are terminal.

## Rate limits

| Bucket | Limit |
| --- | --- |
| Login | per IP, tight window |
| Password unlock | per IP |
| Uploads | per user + IP, max 30 per window |
| API | per user + IP |
| Share access | per IP |

Exceeded limits return `429 RATE_LIMITED` with `Retry-After`. Counters are
in-process; a shared store is needed once the app runs on more than one
instance.

## Error codes

`UNAUTHENTICATED` · `UNAUTHORIZED` · `FORBIDDEN` · `VALIDATION_ERROR` ·
`RESOURCE_NOT_FOUND` · `NOT_FOUND` · `CONFLICT` · `DOCUMENT_CONFLICT` ·
`DOCUMENT_EXPIRED` · `DOCUMENT_ARCHIVED` · `INVALID_PASSWORD` · `RATE_LIMITED` ·
`PLAN_LIMIT_REACHED` · `FEATURE_NOT_AVAILABLE` · `STORAGE_LIMIT_REACHED` ·
`FILE_TOO_LARGE` · `UNSUPPORTED_FILE_TYPE` · `INVALID_FILE_CONTENT` ·
`UPLOAD_FAILED` · `PROCESSING_FAILED` · `SUBSCRIPTION_REQUIRED` ·
`STRIPE_ERROR` · `EXPIRED` · `PENDING` · `DENIED` · `INTERNAL_ERROR`

## Plan limits (defaults)

| | Free | Pro | Business |
| --- | --- | --- | --- |
| Active docs | 1 | ∞ | ∞ |
| Projects | 0 | ∞ | ∞ |
| Max file | 10 MB | 100 MB | 500 MB |
| Storage | 25 MB | 10 GB | 100 GB |
| Password | no | yes | yes |
| Versions | no | yes | yes |
| DOCX | no | yes | yes |
| CLI push --all | no | yes | yes |
| Team members | no | no | yes |
| API tokens | no | no | yes |
| Custom domains | no | no | yes |
| Audit log | no | no | yes |
