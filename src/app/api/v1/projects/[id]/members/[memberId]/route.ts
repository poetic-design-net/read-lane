import { NextRequest } from "next/server";
import { z } from "zod";
import { apiError, apiOk } from "@/lib/api/errors";
import {
  assertScopeAllowsProject,
  authenticateBearer,
} from "@/lib/cli/tokens";
import {
  removeProjectMember,
  updateProjectMemberRole,
} from "@/lib/projects/members";
import { memberApiError } from "@/lib/projects/member-errors";
import { memberRoleSchema } from "@/lib/validation/document";

const paramsSchema = z.object({
  id: z.string().min(1),
  // Rejected here so a malformed id never reaches the uuid column.
  memberId: z.string().uuid(),
});

export async function PATCH(
  req: NextRequest,
  ctx: { params: Promise<{ id: string; memberId: string }> }
) {
  try {
    const auth = await authenticateBearer(req);
    // Member management is owner territory — CI tokens stay out.
    assertScopeAllowsProject(auth.scope, auth.projectId, null);
    const params = paramsSchema.safeParse(await ctx.params);
    const body = z
      .object({ role: memberRoleSchema })
      .safeParse(await req.json());
    if (!params.success || !body.success) {
      return apiError("VALIDATION_ERROR", "Invalid input", 400);
    }
    await updateProjectMemberRole(
      params.data.id,
      auth.userId,
      params.data.memberId,
      body.data.role
    );
    return apiOk({ updated: true });
  } catch (e) {
    return memberApiError(e);
  }
}

export async function DELETE(
  req: NextRequest,
  ctx: { params: Promise<{ id: string; memberId: string }> }
) {
  try {
    const auth = await authenticateBearer(req);
    // Member management is owner territory — CI tokens stay out.
    assertScopeAllowsProject(auth.scope, auth.projectId, null);
    const params = paramsSchema.safeParse(await ctx.params);
    if (!params.success) {
      return apiError("VALIDATION_ERROR", "Invalid input", 400);
    }
    await removeProjectMember(
      params.data.id,
      auth.userId,
      params.data.memberId
    );
    return apiOk({ removed: true });
  } catch (e) {
    return memberApiError(e);
  }
}
