import { describe, expect, it } from "vitest";
import { evaluateQualityPack, formatQualityPackFailures } from "../src/quality-pack.js";

describe("quality pack guidance", () => {
  it("includes header onboarding guidance when header gate fails", () => {
    const pack = evaluateQualityPack({
      profile: "web-quality",
      headers: {
        results: [{ missing: ["content-security-policy"] }, { missing: ["x-frame-options"] }],
      },
      links: { broken: [], discovered: { total: 1 }, checkStatus: "pass" },
      bundle: { totals: { fileCount: 1 } },
    });
    expect(pack.passed).toBe(false);
    expect(pack.guidance?.some((section) => section.id === "security-headers")).toBe(true);
    const formatted = formatQualityPackFailures(pack);
    expect(formatted).toContain("Onboarding guidance:");
    expect(formatted).toContain("maxHeaderFailures");
    expect(formatted).toContain("next.config.ts");
  });

  it("includes links inconclusive guidance", () => {
    const pack = evaluateQualityPack({
      profile: "web-quality",
      headers: { results: [{ missing: [] }] },
      links: { broken: [], discovered: { total: 0 }, checkStatus: "inconclusive" },
      bundle: { totals: { fileCount: 1 } },
    });
    const formatted = formatQualityPackFailures(pack);
    expect(formatted).toContain("sitemap.xml");
  });
});
