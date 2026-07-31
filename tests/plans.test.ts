import { describe, expect, it } from "vitest";
import { planLimits, planFromPriceId, planConfig } from "@/lib/plans/config";

describe("plan entitlements", () => {
  it("free has one document slot and no projects", () => {
    expect(planLimits.free.maxActiveDocuments).toBe(1);
    expect(planLimits.free.maxProjects).toBe(0);
    expect(planLimits.free.passwordProtection).toBe(false);
    expect(planLimits.free.versionHistory).toBe(false);
    expect(planLimits.free.cliPushAll).toBe(false);
    expect(planLimits.free.cliSingleDocument).toBe(true);
  });

  it("pro unlocks projects, password, versions, cli", () => {
    expect(planLimits.pro.maxActiveDocuments).toBeNull();
    expect(planLimits.pro.maxProjects).toBeNull();
    expect(planLimits.pro.passwordProtection).toBe(true);
    expect(planLimits.pro.versionHistory).toBe(true);
    expect(planLimits.pro.cliProjects).toBe(true);
    expect(planLimits.pro.cliPushAll).toBe(true);
  });

  it("business adds api and team features", () => {
    expect(planLimits.business.apiAccess).toBe(true);
    expect(planLimits.business.teamMembers).toBe(true);
    expect(planLimits.business.customDomains).toBe(true);
  });

  it("legacy planConfig stays aligned", () => {
    expect(planConfig.free.activeDocuments).toBe(1);
    expect(planConfig.pro.passwordProtection).toBe(true);
  });

  it("planFromPriceId defaults to free", () => {
    expect(planFromPriceId(null)).toBe("free");
    expect(planFromPriceId("price_unknown")).toBe("free");
  });
});
