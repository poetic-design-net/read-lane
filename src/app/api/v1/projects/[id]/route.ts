import { NextRequest } from "next/server";
import { apiError, apiOk } from "@/lib/api/errors";
import { authenticateBearer, CliAuthError } from "@/lib/cli/tokens";
import {
  assertProjectAccess,
  ProjectError,
  updateProject,
} from "@/lib/projects/service";
import { projectUpdateSchema } from "@/lib/validation/document";
import { countDocuments } from "@/lib/projects/service";

export async function GET(
  req: NextRequest,
  ctx: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await authenticateBearer(req.headers.get("authorization"));
    const { id } = await ctx.params;
    const project = await assertProjectAccess(id, auth.userId, "viewer");
    const documentCount = await countDocuments(project.id);
    return apiOk({
      project: {
        id: project.publicId,
        name: project.name,
        slug: project.slug,
        description: project.description,
        documentCount,
        defaultVisibility: project.defaultVisibility,
        defaultTheme: project.defaultTheme,
        defaultContentWidth: project.defaultContentWidth,
        defaultFontStyle: project.defaultFontStyle,
        updatedAt: project.updatedAt,
        archivedAt: project.archivedAt,
      },
    });
  } catch (e) {
    if (e instanceof CliAuthError) return apiError("UNAUTHORIZED", e.message, 401);
    if (e instanceof ProjectError) {
      return apiError(
        e.code === "FORBIDDEN" ? "FORBIDDEN" : "NOT_FOUND",
        e.message,
        e.code === "FORBIDDEN" ? 403 : 404
      );
    }
    return apiError("INTERNAL_ERROR", "Unexpected error", 500);
  }
}

export async function PATCH(
  req: NextRequest,
  ctx: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await authenticateBearer(req.headers.get("authorization"));
    const { id } = await ctx.params;
    const body = await req.json();
    const parsed = projectUpdateSchema.safeParse(body);
    if (!parsed.success) {
      return apiError("VALIDATION_ERROR", "Invalid input", 400);
    }
    const updated = await updateProject(id, auth.userId, parsed.data);
    return apiOk({
      project: {
        id: updated.publicId,
        name: updated.name,
        slug: updated.slug,
      },
    });
  } catch (e) {
    if (e instanceof CliAuthError) return apiError("UNAUTHORIZED", e.message, 401);
    if (e instanceof ProjectError) {
      return apiError("FORBIDDEN", e.message, 403);
    }
    return apiError("INTERNAL_ERROR", "Unexpected error", 500);
  }
}
