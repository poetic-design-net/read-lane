import { NextResponse } from "next/server";
import { randomBytes } from "crypto";

export type ApiErrorCode =
  | "UNAUTHENTICATED"
  | "UNAUTHORIZED"
  | "FORBIDDEN"
  | "VALIDATION_ERROR"
  | "RESOURCE_NOT_FOUND"
  | "NOT_FOUND"
  | "CONFLICT"
  | "DOCUMENT_CONFLICT"
  | "DOCUMENT_EXPIRED"
  | "DOCUMENT_ARCHIVED"
  | "INVALID_PASSWORD"
  | "RATE_LIMITED"
  | "PLAN_LIMIT_REACHED"
  | "FEATURE_NOT_AVAILABLE"
  | "STORAGE_LIMIT_REACHED"
  | "FILE_TOO_LARGE"
  | "UNSUPPORTED_FILE_TYPE"
  | "INVALID_FILE_CONTENT"
  | "UPLOAD_FAILED"
  | "PROCESSING_FAILED"
  | "SUBSCRIPTION_REQUIRED"
  | "STRIPE_ERROR"
  | "EXPIRED"
  | "PENDING"
  | "DENIED"
  | "INTERNAL_ERROR";

export function createRequestId(): string {
  return `req_${randomBytes(12).toString("hex")}`;
}

export function apiMeta(requestId?: string) {
  return { requestId: requestId ?? createRequestId() };
}

export function apiError(
  code: ApiErrorCode,
  message: string,
  status: number,
  details?: Record<string, unknown>,
  requestId?: string
) {
  const meta = apiMeta(requestId);
  return NextResponse.json(
    {
      error: {
        code,
        message,
        details: details ?? {},
      },
      meta,
    },
    {
      status,
      headers: {
        "x-request-id": meta.requestId,
        ...(status === 429 && details?.retryAfter
          ? { "Retry-After": String(details.retryAfter) }
          : {}),
      },
    }
  );
}

export function apiOk<T>(
  data: T,
  status = 200,
  requestId?: string,
  extraMeta?: Record<string, unknown>
) {
  const meta = { ...apiMeta(requestId), ...extraMeta };
  return NextResponse.json(
    { data, meta },
    {
      status,
      headers: { "x-request-id": meta.requestId },
    }
  );
}

/** Map plan/document errors to API codes */
export function mapServiceError(e: unknown): {
  code: ApiErrorCode;
  message: string;
  status: number;
  details?: Record<string, unknown>;
} {
  if (e && typeof e === "object" && "code" in e && "message" in e) {
    const err = e as { code: string; message: string; details?: Record<string, unknown> };
    switch (err.code) {
      case "UNAUTHORIZED":
      case "INVALID_CREDENTIALS":
        return { code: "UNAUTHENTICATED", message: err.message, status: 401 };
      case "FORBIDDEN":
        return { code: "FORBIDDEN", message: err.message, status: 403 };
      case "NOT_FOUND":
        return {
          code: "RESOURCE_NOT_FOUND",
          message: err.message,
          status: 404,
        };
      case "CONFLICT":
      case "DOCUMENT_CONFLICT":
        return {
          code: "DOCUMENT_CONFLICT",
          message: err.message,
          status: 409,
          details: err.details,
        };
      case "EXPIRED":
        return { code: "DOCUMENT_EXPIRED", message: err.message, status: 410 };
      case "ARCHIVED":
        return {
          code: "DOCUMENT_ARCHIVED",
          message: err.message,
          status: 410,
        };
      case "PLAN_LIMIT":
      case "UPGRADE_REQUIRED":
        return {
          code: "PLAN_LIMIT_REACHED",
          message: err.message,
          status: 402,
        };
      case "FEATURE_LOCKED":
        return {
          code: "FEATURE_NOT_AVAILABLE",
          message: err.message,
          status: 403,
        };
      case "VALIDATION":
      case "EMAIL_TAKEN":
      case "INVALID_TOKEN":
        return {
          code: "VALIDATION_ERROR",
          message: err.message,
          status: 400,
        };
      case "RATE_LIMITED":
        return { code: "RATE_LIMITED", message: err.message, status: 429 };
      case "PENDING":
        return { code: "PENDING", message: err.message, status: 202 };
      case "DENIED":
        return { code: "DENIED", message: err.message, status: 403 };
      default:
        break;
    }
  }
  const message =
    e instanceof Error ? e.message : "An unexpected error occurred";
  return { code: "INTERNAL_ERROR", message, status: 500 };
}
