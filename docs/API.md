# Readlane API (v1)

Base URL: `{NEXT_PUBLIC_APP_URL}/api/v1`

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

## Documents

| Method | Path |
| --- | --- |
| GET/POST | `/documents` |
| GET/PUT/DELETE | `/documents/:id` |
| POST | `/documents/:id/publish` |
| POST | `/documents/:id/archive` |
| GET | `/documents/:id/versions` |
| POST | `/documents/:id/versions/:version/restore` |

Free: one active document; `replaceActive: true` keeps `shareId`.

## Uploads

| Method | Path |
| --- | --- |
| POST | `/uploads` | `multipart/form-data` field `file` |

## Shares (public)

| Method | Path |
| --- | --- |
| GET | `/shares/:shareId` |
| POST | `/shares/:shareId/unlock` |

Public page: `https://…/s/{shareId}` (alias `/d/{shareId}`).

## CLI

| Method | Path |
| --- | --- |
| POST | `/cli/device` | start device flow |
| POST | `/cli/device/token` | poll |
| … | existing device approve/deny routes |

## Error codes

`UNAUTHENTICATED` · `UNAUTHORIZED` · `VALIDATION_ERROR` · `RESOURCE_NOT_FOUND` · `DOCUMENT_CONFLICT` · `DOCUMENT_EXPIRED` · `DOCUMENT_ARCHIVED` · `INVALID_PASSWORD` · `RATE_LIMITED` · `PLAN_LIMIT_REACHED` · `FEATURE_NOT_AVAILABLE` · `STORAGE_LIMIT_REACHED` · `FILE_TOO_LARGE` · `UNSUPPORTED_FILE_TYPE` · `INVALID_FILE_CONTENT` · `UPLOAD_FAILED` · `STRIPE_ERROR` · `INTERNAL_ERROR`

## Plan limits (defaults)

| | Free | Pro | Business |
| --- | --- | --- | --- |
| Active docs | 1 | ∞ | ∞ |
| Projects | 0 | ∞ | ∞ |
| Max file | 10 MB | 100 MB | 500 MB |
| Storage | 25 MB | 10 GB | 100 GB |
| Password | no | yes | yes |
| Versions | no | yes | yes |
| CLI push --all | no | yes | yes |
| API tokens | no | no | yes |
