import { describe, expect, it } from "vitest";
import {
  apiError,
  apiOk,
  createRequestId,
  mapServiceError,
} from "@/lib/api/errors";

describe("api response helpers", () => {
  it("creates request ids", () => {
    const id = createRequestId();
    expect(id.startsWith("req_")).toBe(true);
    expect(id.length).toBeGreaterThan(10);
  });

  it("apiOk wraps data + meta", async () => {
    const res = apiOk({ hello: "world" }, 200, "req_test");
    const json = await res.json();
    expect(json.data.hello).toBe("world");
    expect(json.meta.requestId).toBe("req_test");
  });

  it("apiError standard shape", async () => {
    const res = apiError(
      "PLAN_LIMIT_REACHED",
      "limit",
      402,
      { foo: 1 },
      "req_err"
    );
    const json = await res.json();
    expect(json.error.code).toBe("PLAN_LIMIT_REACHED");
    expect(json.error.details.foo).toBe(1);
    expect(json.meta.requestId).toBe("req_err");
  });

  it("maps plan errors", () => {
    const m = mapServiceError({
      code: "UPGRADE_REQUIRED",
      message: "upgrade",
    });
    expect(m.code).toBe("PLAN_LIMIT_REACHED");
    expect(m.status).toBe(402);
  });

  it("maps conflicts", () => {
    const m = mapServiceError({
      code: "CONFLICT",
      message: "conflict",
      details: { remoteVersion: 7 },
    });
    expect(m.code).toBe("DOCUMENT_CONFLICT");
    expect(m.status).toBe(409);
  });
});
