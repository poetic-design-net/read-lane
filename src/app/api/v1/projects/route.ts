import { NextRequest } from "next/server";
import { apiError, apiOk } from "@/lib/api/errors";
import { authenticateBearer, CliAuthError } from "@/lib/cli/tokens";
import { createProject, listProjectsForUser } from "@/lib/projects/service";
import { projectCreateSchema } from "@/lib/validation/document";
import { checkRateLimit } from "@/lib/security/rate-limit";
import { appConfig } from "@/lib/config";

export async function GET(req: NextRequest) {
  try {
    const auth = await authenticateBearer(req);
    const projects = await listProjectsForUser(auth.userId);
    return apiOk({
      projects: projects.map((p) => ({
        id: p.publicId,
        name: p.name,
        slug: p.slug,
        description: p.description,
        documentCount: p.documentCount,
        updatedAt: p.updatedAt,
        archivedAt: p.archivedAt,
        defaultVisibility: p.defaultVisibility,
        defaultTheme: p.defaultTheme,
        defaultContentWidth: p.defaultContentWidth,
        defaultFontStyle: p.defaultFontStyle,
      })),
    });
  } catch (e) {
    if (e instanceof CliAuthError) {
      return apiError("UNAUTHORIZED", e.message, 401);
    }
    return apiError("INTERNAL_ERROR", "Unexpected error", 500);
  }
}

export async function POST(req: NextRequest) {
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0] ?? "unknown";
  const rl = checkRateLimit(
    `api:${ip}`,
    appConfig.rateLimit.api.windowMs,
    appConfig.rateLimit.api.max
  );
  if (!rl.success) return apiError("RATE_LIMITED", "Too many requests", 429);

  try {
    const auth = await authenticateBearer(req);
    const body = await req.json();
    const parsed = projectCreateSchema.safeParse(body);
    if (!parsed.success) {
      return apiError("VALIDATION_ERROR", "Invalid input", 400, {
        issues: parsed.error.issues,
      });
    }
    const project = await createProject(auth.userId, parsed.data);
    return apiOk(
      {
        project: {
          id: project.publicId,
          name: project.name,
          slug: project.slug,
          description: project.description,
        },
      },
      201
    );
  } catch (e) {
    if (e instanceof CliAuthError) {
      return apiError("UNAUTHORIZED", e.message, 401);
    }
    return apiError("INTERNAL_ERROR", "Unexpected error", 500);
  }
}
