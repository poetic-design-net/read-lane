import pc from "picocolors";
import { api, requireAuth } from "../lib/api.js";
import { clearToken } from "../lib/config.js";

export async function whoamiCommand() {
  requireAuth();
  const me = await api<{ user: { email: string; name: string | null } }>(
    "/api/v1/me"
  );
  console.log(pc.bold(me.user.email));
  if (me.user.name) console.log(me.user.name);
}

export async function logoutCommand() {
  clearToken();
  console.log(pc.green("✓ Abgemeldet."));
}
