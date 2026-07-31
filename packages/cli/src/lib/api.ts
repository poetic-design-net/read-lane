import { loadToken, DEFAULT_API_URL } from "./config.js";

export class ApiError extends Error {
  constructor(
    message: string,
    public status: number,
    public code?: string,
    public details?: Record<string, unknown>
  ) {
    super(message);
    this.name = "ApiError";
  }
}

export async function api<T>(
  path: string,
  options: RequestInit & { token?: string; apiUrl?: string } = {}
): Promise<T> {
  const auth = loadToken();
  const base = options.apiUrl ?? auth?.apiUrl ?? DEFAULT_API_URL;
  const token = options.token ?? auth?.token;
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    Accept: "application/json",
    ...(options.headers as Record<string, string>),
  };
  if (token) headers.Authorization = `Bearer ${token}`;

  const res = await fetch(`${base.replace(/\/$/, "")}${path}`, {
    ...options,
    headers,
  });

  const json = (await res.json().catch(() => ({}))) as {
    error?: { code?: string; message?: string; details?: Record<string, unknown> };
  } & T;

  if (!res.ok) {
    throw new ApiError(
      json.error?.message ?? `HTTP ${res.status}`,
      res.status,
      json.error?.code,
      json.error?.details
    );
  }
  return json as T;
}

export function requireAuth() {
  const auth = loadToken();
  if (!auth?.token) {
    throw new Error("Nicht angemeldet. Führen Sie `readlane login` aus.");
  }
  return auth;
}
