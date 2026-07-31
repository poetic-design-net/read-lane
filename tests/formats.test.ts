import { describe, expect, it } from "vitest";
import {
  detectRenderer,
  extensionOf,
  languageFromExtension,
} from "@/lib/documents/formats";
import { planConfig } from "@/lib/plans/config";

describe("formats", () => {
  it("detects markdown", () => {
    expect(detectRenderer("README.md")).toBe("markdown");
    expect(detectRenderer("notes.markdown")).toBe("markdown");
  });

  it("detects code and csv", () => {
    expect(detectRenderer("app.ts")).toBe("code");
    expect(detectRenderer("data.csv")).toBe("csv");
    expect(detectRenderer("notes.txt")).toBe("text");
    expect(detectRenderer("report.pdf")).toBe("pdf");
    expect(detectRenderer("hero.png")).toBe("image");
  });

  it("parses extensions", () => {
    expect(extensionOf("docs/api.ts")).toBe("ts");
    expect(extensionOf(".env.example")).toBe("env");
  });

  it("maps languages", () => {
    expect(languageFromExtension("ts")).toBe("typescript");
    expect(languageFromExtension("py")).toBe("python");
  });
});

describe("planConfig", () => {
  it("free has one active document and no projects", () => {
    expect(planConfig.free.activeDocuments).toBe(1);
    expect(planConfig.free.projects).toBe(0);
    expect(planConfig.free.passwordProtection).toBe(false);
  });

  it("pro unlocks multi-doc and password", () => {
    expect(planConfig.pro.activeDocuments).toBe(Infinity);
    expect(planConfig.pro.passwordProtection).toBe(true);
    expect(planConfig.pro.versionHistory).toBe(true);
  });
});
