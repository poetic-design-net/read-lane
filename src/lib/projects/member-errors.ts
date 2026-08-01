import { apiError } from "@/lib/api/errors";
import { CliAuthError } from "@/lib/cli/tokens";
import { PlanError } from "@/lib/plans/service";
import { ProjectError } from "./service";

/** Shared error mapping for the member routes. */
export function memberApiError(e: unknown) {
  if (e instanceof CliAuthError) return apiError("UNAUTHORIZED", e.message, 401);
  if (e instanceof PlanError) {
    return apiError("FEATURE_NOT_AVAILABLE", e.message, 402);
  }
  if (e instanceof ProjectError) {
    switch (e.code) {
      case "FORBIDDEN":
        return apiError("FORBIDDEN", e.message, 403);
      case "CONFLICT":
        return apiError("CONFLICT", e.message, 409);
      case "VALIDATION":
        return apiError("VALIDATION_ERROR", e.message, 400);
      default:
        return apiError("NOT_FOUND", e.message, 404);
    }
  }
  return apiError("INTERNAL_ERROR", "Unexpected error", 500);
}
