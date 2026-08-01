import { NextRequest } from "next/server";
import { apiError, apiOk, createRequestId } from "@/lib/api/errors";
import { requireAuth, ApiAuthError } from "@/lib/api/auth-context";
import { assertScopeAllowsProject, CliAuthError } from "@/lib/cli/tokens";
import {
  createDocument,
  DocumentError,
  listDocumentsForUser,
} from "@/lib/documents/service";
import { publishDocumentSchema } from "@/lib/validation/document";
import { PlanError } from "@/lib/plans/service";
import { writeAuditLog } from "@/lib/audit/service";
import { getClientIp } from "@/lib/security/client-ip";
import { shareUrl } from "@/lib/utils/urls";

export async function GET(req: NextRequest) {
  const requestId = createRequestId();
  try {
    const auth = await requireAuth(req);
    const { searchParams } = new URL(req.url);
    const docs = await listDocumentsForUser(auth.userId, {
      // A project-scoped token never sees beyond its project.
      projectId:
        auth.tokenProjectId ?? searchParams.get("projectId") ?? undefined,
      status: searchParams.get("status") ?? undefined,
      visibility: searchParams.get("visibility") ?? undefined,
      q: searchParams.get("q") ?? undefined,
      limit: Number(searchParams.get("limit") ?? 50),
    });
    return apiOk({ documents: docs }, 200, requestId);
  } catch (e) {
    if (e instanceof ApiAuthError) {
      return apiError(
        e.status === 403 ? "FORBIDDEN" : "UNAUTHENTICATED",
        e.message,
        e.status,
        {},
        requestId
      );
    }
    if (e instanceof CliAuthError) {
      return apiError("FORBIDDEN", e.message, 403, {}, requestId);
    }
    return apiError("INTERNAL_ERROR", "Unexpected error", 500, {}, requestId);
  }
}

export async function POST(req: NextRequest) {
  const requestId = createRequestId();
  try {
    const auth = await requireAuth(req);
    const body = await req.json();
    const parsed = publishDocumentSchema.safeParse({
      ...body,
      markdownContent: body.markdownContent ?? body.content ?? "",
    });
    if (!parsed.success) {
      return apiError(
        "VALIDATION_ERROR",
        "Invalid document",
        400,
        { issues: parsed.error.issues },
        requestId
      );
    }

    // Loose documents are out of reach for a project-scoped token.
    assertScopeAllowsProject(
      auth.scope,
      auth.tokenProjectId,
      parsed.data.projectId ?? null
    );

    const result = await createDocument(parsed.data, {
      userId: auth.userId,
      source: auth.actorType === "cli" ? "cli" : "api",
      deviceName: auth.deviceName,
      replaceActive: body.replaceActive === true || body.replace === true,
    });

    const replaced = "replaced" in result && result.replaced === true;

    await writeAuditLog({
      action: replaced ? "document.replaced" : "document.created",
      actorType: auth.actorType,
      userId: auth.userId,
      actorId: auth.userId,
      documentId: undefined,
      ip: await getClientIp(),
      metadata: {
        publicId: result.document.publicId,
        replaced,
      },
    });

    return apiOk(
      {
        document: {
          id: result.document.publicId,
          title: result.document.title,
          version: result.document.version,
          status: result.document.status,
          visibility: result.document.visibility,
          shareUrl: result.shareUrl || shareUrl(result.document.publicId),
          shareId: result.document.publicId,
          replaced,
        },
        managementToken: result.managementToken || undefined,
      },
      replaced ? 200 : 201,
      requestId
    );

  } catch (e) {
    if (e instanceof ApiAuthError) {
      return apiError(
        e.status === 403 ? "FORBIDDEN" : "UNAUTHENTICATED",
        e.message,
        e.status,
        {},
        requestId
      );
    }
    if (e instanceof CliAuthError) {
      return apiError("FORBIDDEN", e.message, 403, {}, requestId);
    }
    if (e instanceof PlanError) {
      return apiError(
        e.code === "FEATURE_LOCKED"
          ? "FEATURE_NOT_AVAILABLE"
          : "PLAN_LIMIT_REACHED",
        e.message,
        e.code === "FEATURE_LOCKED" ? 403 : 402,
        {},
        requestId
      );
    }
    if (e instanceof DocumentError) {
      return apiError(
        e.code === "PLAN_LIMIT" ? "PLAN_LIMIT_REACHED" : "VALIDATION_ERROR",
        e.message,
        e.code === "PLAN_LIMIT" ? 402 : 400,
        {},
        requestId
      );
    }
    console.error("[documents POST]", e);
    return apiError("INTERNAL_ERROR", "Create failed", 500, {}, requestId);
  }
}
