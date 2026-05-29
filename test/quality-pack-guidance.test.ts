import { describe, expect, it } from "vitest";
import { evaluateQualityPack, formatQualityPackFailures } from "../src/quality-pack.js";

const extendedRunners = {
  health: { results: [{ statusCode: 200 }] },
  console: { results: [{ status: "ok" as const, events: [] }] },
  measure: { results: [{ runtimeErrorMessage: undefined }] },
  accessibility: {
    meta: { configPath: "signaler.config.json", comboCount: 1, startedAt: "", completedAt: "", elapsedMs: 1 },
    results: [{ url: "http://127.0.0.1:3000/", path: "/", label: "home", device: "mobile" as const, violations: [] }],
  },
};

describe("quality pack guidance", () => {
  it("includes header onboarding guidance when header gate fails", () => {
    const pack = evaluateQualityPack({
      profile: "web-quality",
      headers: {
        results: [{ missing: ["content-security-policy"] }, { missing: ["x-frame-options"] }],
      },
      links: { broken: [], discovered: { total: 1 }, checkStatus: "pass" },
      bundle: { totals: { fileCount: 1 } },
      ...extendedRunners,
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
      ...extendedRunners,
    });
    const formatted = formatQualityPackFailures(pack);
    expect(formatted).toContain("sitemap.xml");
  });
});
