import { NextRequest } from "next/server";
import { apiError, apiOk } from "@/lib/api/errors";
import { startDeviceFlow, pollDeviceCode, CliAuthError } from "@/lib/cli/tokens";
import { checkRateLimit } from "@/lib/security/rate-limit";
import { appConfig } from "@/lib/config";

export async function POST(req: NextRequest) {
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0] ?? "unknown";
  const rl = checkRateLimit(
    `cli-device:${ip}`,
    appConfig.rateLimit.cliDevice.windowMs,
    appConfig.rateLimit.cliDevice.max
  );
  if (!rl.success) {
    return apiError("RATE_LIMITED", "Too many requests", 429);
  }

  let body: { deviceName?: string; operatingSystem?: string; deviceCode?: string; action?: string } = {};
  try {
    body = await req.json();
  } catch {
    body = {};
  }

  // Poll existing device code
  if (body.action === "poll" && body.deviceCode) {
    try {
      const result = await pollDeviceCode(body.deviceCode);
      return apiOk(result);
    } catch (e) {
      if (e instanceof CliAuthError) {
        if (e.code === "PENDING") {
          return apiError("PENDING", e.message, 428);
        }
        if (e.code === "DENIED") {
          return apiError("DENIED", e.message, 403);
        }
        if (e.code === "EXPIRED") {
          return apiError("EXPIRED", e.message, 410);
        }
        return apiError("UNAUTHORIZED", e.message, 401);
      }
      return apiError("INTERNAL_ERROR", "Unexpected error", 500);
    }
  }

  // Start new device flow
  try {
    const result = await startDeviceFlow({
      deviceName: body.deviceName,
      operatingSystem: body.operatingSystem,
    });
    return apiOk(result, 201);
  } catch {
    return apiError("INTERNAL_ERROR", "Could not start device flow", 500);
  }
}
