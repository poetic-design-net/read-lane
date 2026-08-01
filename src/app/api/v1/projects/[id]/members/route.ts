import { NextRequest } from "next/server";
import { apiError, apiOk } from "@/lib/api/errors";
import {
  assertScopeAllowsProject,
  authenticateBearer,
} from "@/lib/cli/tokens";
import { addProjectMember, listProjectMembers } from "@/lib/projects/members";
import { memberApiError } from "@/lib/projects/member-errors";
import { addMemberSchema } from "@/lib/validation/document";

export async function GET(
  req: NextRequest,
  ctx: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await authenticateBearer(req);
    // Member management is owner territory — CI tokens stay out.
    assertScopeAllowsProject(auth.scope, auth.projectId, null);
    const { id } = await ctx.params;
    const members = await listProjectMembers(id, auth.userId);
    return apiOk({ members });
  } catch (e) {
    return memberApiError(e);
  }
}

export async function POST(
  req: NextRequest,
  ctx: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await authenticateBearer(req);
    // Member management is owner territory — CI tokens stay out.
    assertScopeAllowsProject(auth.scope, auth.projectId, null);
    const { id } = await ctx.params;
    const parsed = addMemberSchema.safeParse(await req.json());
    if (!parsed.success) {
      return apiError("VALIDATION_ERROR", "Invalid input", 400);
    }
    const member = await addProjectMember(id, auth.userId, parsed.data);
    return apiOk({ member }, 201);
  } catch (e) {
    return memberApiError(e);
  }
}
