import { NextRequest } from "next/server";
import { apiError, apiOk, createRequestId } from "@/lib/api/errors";
import {
  DocumentError,
  getPublicDocumentView,
} from "@/lib/documents/service";
import { hasUnlockSession } from "@/lib/security/session";
import { checkRateLimit } from "@/lib/security/rate-limit";
import { getClientIp } from "@/lib/security/client-ip";
import { appConfig } from "@/lib/config";

/**
 * Public share lookup by shareId (documents.publicId).
 * Never leaks internal ids or soft-deleted content.
 */
export async function GET(
  _req: NextRequest,
  ctx: { params: Promise<{ shareId: string }> }
) {
  const requestId = createRequestId();
  try {
    const ip = await getClientIp();
    const rl = checkRateLimit(
      `share:get:${ip}`,
      appConfig.rateLimit.api.windowMs,
      appConfig.rateLimit.api.max
    );
    if (!rl.success) {
      return apiError(
        "RATE_LIMITED",
        "Too many requests",
        429,
        { retryAfter: Math.ceil(rl.resetMs / 1000) },
        requestId
      );
    }

    const { shareId } = await ctx.params;
    const view = await getPublicDocumentView(shareId);
    const unlocked =
      !view.requiresPassword || (await hasUnlockSession(shareId));

    if (view.requiresPassword && !unlocked) {
      return apiOk(
        {
          available: true,
          requiresPassword: true,
          document: {
            id: view.document.publicId,
            title: view.document.title,
            description: view.document.description,
          },
        },
        200,
        requestId
      );
    }

    return apiOk(
      {
        available: true,
        requiresPassword: false,
        document: {
          id: view.document.publicId,
          title: view.document.title,
          description: view.document.description,
          content: view.document.markdownContent,
          rendererType: view.raw.rendererType,
          theme: view.document.theme,
          contentWidth: view.document.contentWidth,
          fontStyle: view.document.fontStyle,
          showTableOfContents: view.document.showTableOfContents,
          showCodeLineNumbers: view.document.showCodeLineNumbers,
          allowDownload: view.raw.allowDownload,
          updatedAt: view.document.updatedAt,
          version: view.raw.version,
        },
      },
      200,
      requestId
    );
  } catch (e) {
    if (e instanceof DocumentError) {
      if (e.code === "EXPIRED") {
        return apiError(
          "DOCUMENT_EXPIRED",
          "Dieses Dokument ist nicht verfügbar.",
          410,
          {},
          requestId
        );
      }
      if (e.code === "ARCHIVED") {
        return apiError(
          "DOCUMENT_ARCHIVED",
          "Dieses Dokument ist nicht verfügbar.",
          410,
          {},
          requestId
        );
      }
      return apiError(
        "RESOURCE_NOT_FOUND",
        "Dieses Dokument ist nicht verfügbar.",
        404,
        {},
        requestId
      );
    }
    return apiError("INTERNAL_ERROR", "Unexpected error", 500, {}, requestId);
  }
}
