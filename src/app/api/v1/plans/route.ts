import { apiOk, createRequestId } from "@/lib/api/errors";
import { planLimits, planConfig } from "@/lib/plans/config";

export async function GET() {
  const requestId = createRequestId();
  return apiOk(
    {
      plans: (["free", "pro", "business"] as const).map((id) => ({
        id,
        name: planConfig[id].name,
        entitlements: planLimits[id],
      })),
    },
    200,
    requestId
  );
}
