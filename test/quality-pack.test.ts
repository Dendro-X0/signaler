import { describe, expect, it } from "vitest";
import { evaluateQualityPack, mergeQualityPackExitCode } from "../src/quality-pack.js";

describe("quality pack", () => {
  it("passes when side runners have no failures", () => {
    const result = evaluateQualityPack({
      profile: "web-quality",
      headers: {
        results: [{ missing: [], runtimeErrorMessage: undefined }],
      },
      links: { broken: [] },
      bundle: {
        meta: { detected: { nextDir: true, distDir: false } },
        totals: { fileCount: 3 },
      },
    });
    expect(result.passed).toBe(true);
    expect(result.violations).toHaveLength(0);
  });

  it("fails on header and link violations", () => {
    const result = evaluateQualityPack({
      profile: "web-quality",
      headers: {
        results: [{ missing: ["content-security-policy"] }],
      },
      links: { broken: [{ url: "https://example.com/missing" }] },
      bundle: {
        meta: { detected: { nextDir: false, distDir: false } },
        totals: { fileCount: 0 },
      },
    });
    expect(result.passed).toBe(false);
    expect(result.violations.map((v) => v.id)).toContain("max-header-failures");
    expect(result.violations.map((v) => v.id)).toContain("max-broken-links");
  });

  it("mergeQualityPackExitCode preserves prior failure", () => {
    const pack = evaluateQualityPack({
      profile: "web-quality",
      headers: { results: [] },
      links: { broken: [] },
      bundle: { totals: { fileCount: 1 } },
    });
    expect(mergeQualityPackExitCode(1, pack)).toBe(1);
    expect(mergeQualityPackExitCode(0, { ...pack, passed: false, violations: [{ id: "x", message: "m", severity: "critical" }] })).toBe(1);
  });
});
