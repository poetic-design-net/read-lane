import { describe, expect, it } from "vitest";
import { normalizeHost, DomainError } from "@/lib/domains/service";
import { shareUrlOn } from "@/lib/utils/urls";

describe("custom domains", () => {
  it("strips scheme, path and port", () => {
    expect(normalizeHost("https://Docs.Example.com/foo?x=1")).toBe(
      "docs.example.com"
    );
    expect(normalizeHost(" example.com. ")).toBe("example.com");
    expect(normalizeHost("app.example.co.uk:3000")).toBe("app.example.co.uk");
  });

  it("rejects anything that is not a hostname", () => {
    for (const bad of ["localhost", "", "-bad.com", "exam ple.com", "a..b.com"]) {
      expect(() => normalizeHost(bad)).toThrow(DomainError);
    }
  });

  it("falls back to the app host without a domain", () => {
    expect(shareUrlOn("docs.example.com", "abc")).toBe(
      "https://docs.example.com/s/abc"
    );
    expect(shareUrlOn(null, "abc")).toMatch(/\/s\/abc$/);
  });
});
