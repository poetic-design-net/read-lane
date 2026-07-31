import { NextResponse } from "next/server";

export type ApiErrorCode =
  | "VALIDATION_ERROR"
  | "UNAUTHORIZED"
  | "FORBIDDEN"
  | "NOT_FOUND"
  | "DOCUMENT_CONFLICT"
  | "RATE_LIMITED"
  | "EXPIRED"
  | "INTERNAL_ERROR"
  | "PENDING"
  | "DENIED";

export function apiError(
  code: ApiErrorCode,
  message: string,
  status: number,
  details?: Record<string, unknown>
) {
  return NextResponse.json(
    {
      error: {
        code,
        message,
        details: details ?? {},
      },
    },
    { status }
  );
}

export function apiOk<T>(data: T, status = 200) {
  return NextResponse.json(data, { status });
}
