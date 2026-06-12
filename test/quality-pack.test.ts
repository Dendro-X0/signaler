import { mkdtemp, readFile, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { isAgentIndexV3 } from "../src/engine-contracts/artifacts/v3/index.js";
import { evaluateQualityPack, mergeQualityPackExitCode, mergeQualityPackIntoAgentIndex } from "../src/quality-pack.js";

const extendedRunners = {
  health: { results: [{ statusCode: 200 }] },
  console: { results: [{ status: "ok" as const, events: [] }] },
  measure: { results: [{ runtimeErrorMessage: undefined }] },
  accessibility: {
    meta: { configPath: "signaler.config.json", comboCount: 1, startedAt: "", completedAt: "", elapsedMs: 1 },
    results: [{ url: "http://127.0.0.1:3000/", path: "/", label: "home", device: "mobile" as const, violations: [] }],
  },
};

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
      ...extendedRunners,
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
      ...extendedRunners,
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
      ...extendedRunners,
    });
    expect(result.passed).toBe(false);
    expect(result.summary.linksStatus).toBe("inconclusive");
    expect(result.violations.map((v) => v.id)).toContain("links-inconclusive");
  });

  it("fails on health and console violations", () => {
    const result = evaluateQualityPack({
      profile: "web-quality",
      headers: { results: [{ missing: [] }] },
      links: { broken: [], discovered: { total: 2 }, checkStatus: "pass" },
      bundle: { totals: { fileCount: 1 } },
      health: { results: [{ statusCode: 500 }] },
      console: { results: [{ status: "error", events: [{ type: "error" }] }] },
      measure: { results: [] },
      accessibility: extendedRunners.accessibility,
    });
    expect(result.passed).toBe(false);
    expect(result.violations.map((v) => v.id)).toContain("max-health-errors");
    expect(result.violations.map((v) => v.id)).toContain("max-console-error-combos");
  });

  it("fails on benchmark security family when bridge metrics exceed inherited limits", () => {
    const result = evaluateQualityPack({
      profile: "web-quality",
      headers: { results: [{ missing: [] }] },
      links: { broken: [], discovered: { total: 2 }, checkStatus: "pass" },
      bundle: { totals: { fileCount: 1 } },
      ...extendedRunners,
      benchmarkSignals: {
        enabled: true,
        bridgeDir: "runners/benchmark-bridge",
        families: [
          {
            sourceId: "security-baseline",
            recordCount: 1,
            bridgeFile: "runners/benchmark-bridge/security-baseline.json",
            metrics: { missingHeaderCount: 2 },
            passed: true,
          },
        ],
      },
    });
    expect(result.passed).toBe(false);
    expect(result.violations.map((v) => v.id)).toContain("benchmark-security-baseline-max-records");
    expect(result.benchmarkSignals?.families[0]?.passed).toBe(false);
  });

  it("fails on accessibility critical violations", () => {
    const result = evaluateQualityPack({
      profile: "web-quality",
      headers: { results: [{ missing: [] }] },
      links: { broken: [], discovered: { total: 2 }, checkStatus: "pass" },
      bundle: { totals: { fileCount: 1 } },
      ...extendedRunners,
      accessibility: {
        meta: { configPath: "signaler.config.json", comboCount: 1, startedAt: "", completedAt: "", elapsedMs: 1 },
        results: [
          {
            url: "http://127.0.0.1:3000/",
            path: "/",
            label: "home",
            device: "mobile",
            violations: [{ id: "color-contrast", impact: "critical", nodes: [{}] }],
          },
        ],
      },
    });
    expect(result.passed).toBe(false);
    expect(result.violations.map((v) => v.id)).toContain("max-accessibility-critical");
  });

  it("mergeQualityPackExitCode preserves prior failure", () => {
    const pack = evaluateQualityPack({
      profile: "web-quality",
      headers: { results: [] },
      links: { broken: [], discovered: { total: 2 }, checkStatus: "pass" },
      bundle: { totals: { fileCount: 1 } },
      ...extendedRunners,
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
      ...extendedRunners,
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
    expect(index.entrypoints.health).toBe("health.json");
    expect(index.entrypoints.console).toBe("console.json");
    expect(index.entrypoints.measure).toBe("measure-summary.json");
    expect(index.entrypoints.accessibility).toBe("accessibility-summary.json");
  });
});
