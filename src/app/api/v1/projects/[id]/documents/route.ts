import { NextRequest } from "next/server";
import { and, desc, eq, isNull } from "drizzle-orm";
import { apiError, apiOk } from "@/lib/api/errors";
import {
  assertScopeAllowsProject,
  authenticateBearer,
  CliAuthError,
} from "@/lib/cli/tokens";
import { assertProjectAccess, ProjectError } from "@/lib/projects/service";
import { createDocument, DocumentError } from "@/lib/documents/service";
import { publishDocumentSchema } from "@/lib/validation/document";
import { getDb } from "@/lib/db";
import { documents } from "@/lib/db/schema";
import { toListItem } from "@/lib/documents/mappers";
import { shareUrl } from "@/lib/utils/urls";
import { checkRateLimit } from "@/lib/security/rate-limit";
import { appConfig } from "@/lib/config";

export async function GET(
  req: NextRequest,
  ctx: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await authenticateBearer(req);
    const { id } = await ctx.params;
    const project = await assertProjectAccess(id, auth.userId, "viewer");
    assertScopeAllowsProject(auth.scope, auth.projectId, project.id);
    const db = getDb();
    const rows = await db
      .select()
      .from(documents)
      .where(and(eq(documents.projectId, project.id), isNull(documents.deletedAt)))
      .orderBy(desc(documents.updatedAt))
      .limit(500);

    return apiOk({
      documents: rows.map((d) => ({
        ...toListItem(d),
        id: d.publicId,
        shareUrl: d.status === "published" ? shareUrl(d.publicId) : null,
        version: d.version,
        contentChecksum: d.contentChecksum,
      })),
    });
  } catch (e) {
    if (e instanceof CliAuthError) return apiError("UNAUTHORIZED", e.message, 401);
    if (e instanceof ProjectError) return apiError("NOT_FOUND", e.message, 404);
    return apiError("INTERNAL_ERROR", "Unexpected error", 500);
  }
}

export async function POST(
  req: NextRequest,
  ctx: { params: Promise<{ id: string }> }
) {
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0] ?? "unknown";
  const rl = checkRateLimit(
    `api:${ip}`,
    appConfig.rateLimit.api.windowMs,
    appConfig.rateLimit.api.max
  );
  if (!rl.success) return apiError("RATE_LIMITED", "Too many requests", 429);

  try {
    const auth = await authenticateBearer(req);
    const { id } = await ctx.params;
    const project = await assertProjectAccess(id, auth.userId, "editor");
    assertScopeAllowsProject(auth.scope, auth.projectId, project.id);
    const body = await req.json();

    const parsed = publishDocumentSchema.safeParse({
      title: body.title ?? "Untitled",
      description: body.description,
      markdownContent: body.markdownContent ?? body.content,
      visibility: body.visibility ?? project.defaultVisibility,
      status: body.status ?? (body.published === false ? "draft" : "published"),
      password: body.password,
      theme: body.theme ?? project.defaultTheme,
      contentWidth: body.contentWidth ?? body.width ?? project.defaultContentWidth,
      fontStyle: body.fontStyle ?? body.font ?? project.defaultFontStyle,
      showTableOfContents: body.showTableOfContents ?? body.toc ?? false,
      showCodeLineNumbers: body.showCodeLineNumbers ?? body.lineNumbers ?? false,
      projectId: project.id,
      sourcePath: body.sourcePath,
      sourceFilename: body.sourceFilename,
      slug: body.slug,
      expiryPreset: body.expiryPreset ?? "never",
    });

    if (!parsed.success) {
      return apiError("VALIDATION_ERROR", "Invalid input", 400, {
        issues: parsed.error.issues,
      });
    }

    // Override projectId with internal UUID
    parsed.data.projectId = project.id;

    const result = await createDocument(parsed.data, {
      userId: auth.userId,
      source: "cli",
      deviceName: auth.deviceName,
    });

    return apiOk(
      {
        document: {
          id: result.document.publicId,
          title: result.document.title,
          status: result.document.status,
          visibility: result.document.visibility,
          version: result.document.version,
          shareUrl: result.shareUrl,
        },
        shareUrl: result.shareUrl,
      },
      201
    );
  } catch (e) {
    if (e instanceof CliAuthError) return apiError("UNAUTHORIZED", e.message, 401);
    if (e instanceof ProjectError) return apiError("FORBIDDEN", e.message, 403);
    if (e instanceof DocumentError) return apiError("VALIDATION_ERROR", e.message, 400);
    return apiError("INTERNAL_ERROR", "Unexpected error", 500);
  }
}
