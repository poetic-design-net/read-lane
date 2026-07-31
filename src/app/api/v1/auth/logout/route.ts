import { apiOk, createRequestId } from "@/lib/api/errors";
import { logoutUser } from "@/lib/auth/service";

export async function POST() {
  const requestId = createRequestId();
  await logoutUser();
  return apiOk({ ok: true }, 200, requestId);
}
