import { NextRequest } from "next/server";
import { apiError, apiOk, createRequestId } from "@/lib/api/errors";
import { requireAuth, ApiAuthError } from "@/lib/api/auth-context";
import { FileError, processUpload } from "@/lib/files/service";
import { PlanError } from "@/lib/plans/service";
import { checkRateLimit } from "@/lib/security/rate-limit";
import { getClientIp } from "@/lib/security/client-ip";
import { appConfig } from "@/lib/config";

/**
 * Multipart upload: field "file" required.
 * Returns processed file metadata + extracted text content when applicable.
 */
export async function POST(req: NextRequest) {
  const requestId = createRequestId();
  try {
    const auth = await requireAuth(req);
    const ip = await getClientIp();
    const rl = checkRateLimit(
      `upload:${auth.userId}:${ip}`,
      appConfig.rateLimit.api.windowMs,
      Math.min(appConfig.rateLimit.api.max, 30)
    );
    if (!rl.success) {
      return apiError(
        "RATE_LIMITED",
        "Too many uploads",
        429,
        { retryAfter: Math.ceil(rl.resetMs / 1000) },
        requestId
      );
    }

    const form = await req.formData();
    const file = form.get("file");
    if (!(file instanceof File)) {
      return apiError(
        "VALIDATION_ERROR",
        "file field required",
        400,
        {},
        requestId
      );
    }

    const buf = Buffer.from(await file.arrayBuffer());
    const result = await processUpload({
      userId: auth.userId,
      filename: file.name,
      mimeType: file.type || null,
      data: buf,
      documentPublicId:
        typeof form.get("documentId") === "string"
          ? String(form.get("documentId"))
          : null,
    });

    return apiOk(
      {
        file: {
          id: result.file.publicId,
          filename: result.file.safeFilename,
          mimeType: result.file.mimeType,
          size: result.file.fileSize,
          rendererType: result.rendererType,
          checksum: result.checksum,
          storageKey: result.storageKey,
        },
        content: result.content,
      },
      201,
      requestId
    );
  } catch (e) {
    if (e instanceof ApiAuthError) {
      return apiError("UNAUTHENTICATED", e.message, 401, {}, requestId);
    }
    if (e instanceof PlanError) {
      const code =
        e.code === "FILE_TOO_LARGE"
          ? "FILE_TOO_LARGE"
          : e.code === "STORAGE_LIMIT"
            ? "STORAGE_LIMIT_REACHED"
            : e.code === "FEATURE_LOCKED"
              ? "FEATURE_NOT_AVAILABLE"
              : "PLAN_LIMIT_REACHED";
      return apiError(code, e.message, 402, {}, requestId);
    }
    if (e instanceof FileError) {
      return apiError(
        e.code === "BLOCKED_SECRET"
          ? "UNSUPPORTED_FILE_TYPE"
          : e.code,
        e.message,
        400,
        {},
        requestId
      );
    }
    console.error("[uploads]", e);
    return apiError("UPLOAD_FAILED", "Upload failed", 500, {}, requestId);
  }
}
