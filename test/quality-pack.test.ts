import { mkdtemp, readFile, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { isAgentIndexV3 } from "../src/engine-contracts/artifacts/v3/index.js";
import { evaluateQualityPack, mergeQualityPackExitCode, mergeQualityPackIntoAgentIndex } from "../src/quality-pack.js";

describe("quality pack", () => {
  it("passes when side runners have no failures", () => {
    const result = evaluateQualityPack({
      profile: "web-quality",
      headers: {
        results: [{ missing: [], runtimeErrorMessage: undefined }],
      },
      links: { broken: [], discovered: { total: 2 }, checkStatus: "pass" },
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
      links: { broken: [{ url: "https://example.com/missing" }], discovered: { total: 1 }, checkStatus: "fail" },
      bundle: {
        meta: { detected: { nextDir: false, distDir: false } },
        totals: { fileCount: 0 },
      },
    });
    expect(result.passed).toBe(false);
    expect(result.violations.map((v) => v.id)).toContain("max-header-failures");
    expect(result.violations.map((v) => v.id)).toContain("max-broken-links");
  });

  it("fails when links check is inconclusive (zero discovered)", () => {
    const result = evaluateQualityPack({
      profile: "web-quality",
      headers: { results: [{ missing: [] }] },
      links: { broken: [], discovered: { total: 0 }, checkStatus: "inconclusive" },
      bundle: { totals: { fileCount: 1 } },
    });
    expect(result.passed).toBe(false);
    expect(result.summary.linksStatus).toBe("inconclusive");
    expect(result.violations.map((v) => v.id)).toContain("links-inconclusive");
  });

  it("mergeQualityPackExitCode preserves prior failure", () => {
    const pack = evaluateQualityPack({
      profile: "web-quality",
      headers: { results: [] },
      links: { broken: [], discovered: { total: 2 }, checkStatus: "pass" },
      bundle: { totals: { fileCount: 1 } },
    });
    expect(mergeQualityPackExitCode(1, pack)).toBe(1);
    expect(mergeQualityPackExitCode(0, { ...pack, passed: false, violations: [{ id: "x", message: "m", severity: "critical" }] })).toBe(1);
  });

  it("mergeQualityPackIntoAgentIndex adds pack pointers", async () => {
    const root = await mkdtemp(join(tmpdir(), "signaler-qp-index-"));
    const pack = evaluateQualityPack({
      profile: "web-quality",
      headers: { results: [] },
      links: { broken: [], discovered: { total: 2 }, checkStatus: "pass" },
      bundle: { totals: { fileCount: 2 } },
    });
    await writeFile(
      join(root, "agent-index.json"),
      JSON.stringify({
        generatedAt: new Date().toISOString(),
        contractVersion: "v3",
        mode: "throughput",
        profile: "ci",
        comparabilityHash: "abc",
        tokenBudget: 1000,
        entrypoints: { run: "run.json", results: "results.json", suggestions: "suggestions.json" },
        topSuggestions: [],
      }),
      "utf8",
    );
    await mergeQualityPackIntoAgentIndex({ outputDir: root, pack });
    const index = JSON.parse(await readFile(join(root, "agent-index.json"), "utf8")) as unknown;
    expect(isAgentIndexV3(index)).toBe(true);
    if (!isAgentIndexV3(index)) {
      return;
    }
    expect(index.qualityPack?.passed).toBe(true);
    expect(index.entrypoints.qualityPack).toBe("quality-pack.json");
    expect(index.entrypoints.headers).toBe("headers.json");
  });
});
