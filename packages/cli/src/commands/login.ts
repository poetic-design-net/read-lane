import open from "open";
import pc from "picocolors";
import { platform } from "node:os";
import { api, ApiError } from "../lib/api.js";
import { saveToken, DEFAULT_API_URL } from "../lib/config.js";

export async function loginCommand(opts: { apiUrl?: string }) {
  const apiUrl = opts.apiUrl ?? DEFAULT_API_URL;
  console.log(pc.dim(`API: ${apiUrl}`));

  const started = await api<{
    deviceCode: string;
    userCode: string;
    verificationUrl: string;
    expiresIn: number;
    interval: number;
  }>("/api/v1/cli/device", {
    method: "POST",
    apiUrl,
    body: JSON.stringify({
      deviceName: platform(),
      operatingSystem: `${platform()} ${process.version}`,
    }),
  });

  console.log();
  console.log(pc.bold("CLI-Anmeldung"));
  console.log(`Code: ${pc.cyan(pc.bold(started.userCode))}`);
  console.log(`Browser: ${started.verificationUrl}`);
  console.log();
  console.log(pc.dim("Warte auf Bestätigung im Browser…"));

  try {
    await open(started.verificationUrl);
  } catch {
    // ignore
  }

  const intervalMs = Math.max(2, started.interval) * 1000;
  const deadline = Date.now() + started.expiresIn * 1000;

  while (Date.now() < deadline) {
    await new Promise((r) => setTimeout(r, intervalMs));
    try {
      const result = await api<{ accessToken: string }>("/api/v1/cli/device", {
        method: "POST",
        apiUrl,
        body: JSON.stringify({
          action: "poll",
          deviceCode: started.deviceCode,
        }),
      });
      saveToken(result.accessToken, apiUrl);
      console.log(pc.green("✓ Angemeldet. Token lokal gespeichert."));
      return;
    } catch (e) {
      if (e instanceof ApiError) {
        if (e.code === "PENDING" || e.status === 428) continue;
        if (e.code === "DENIED") {
          console.error(pc.red("Zugang abgelehnt."));
          process.exitCode = 1;
          return;
        }
        if (e.code === "EXPIRED" || e.status === 410) {
          console.error(pc.red("Code abgelaufen. Bitte erneut versuchen."));
          process.exitCode = 1;
          return;
        }
      }
      throw e;
    }
  }

  console.error(pc.red("Zeitüberschreitung."));
  process.exitCode = 1;
}
