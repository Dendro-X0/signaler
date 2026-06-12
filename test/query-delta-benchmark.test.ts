import { mkdir, writeFile } from "node:fs/promises";
import { mkdtemp } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { buildBenchmarkFamilyDeltas, buildQualityPackDelta } from "../src/query-delta-benchmark.js";
import { buildDeltaProjection } from "../src/query-delta.js";

describe("query-delta benchmark plane", () => {
  it("builds benchmark family deltas from summaries", () => {
    const delta = buildBenchmarkFamilyDeltas({
      before: [
        {
          sourceId: "security-baseline",
          recordCount: 2,
          bridgeFile: "runners/benchmark-bridge/security-baseline.json",
          metrics: { missingHeaderCount: 4 },
          passed: false,
        },
      ],
      after: [
        {
          sourceId: "security-baseline",
          recordCount: 1,
          bridgeFile: "runners/benchmark-bridge/security-baseline.json",
          metrics: { missingHeaderCount: 2 },
          passed: true,
        },
        {
          sourceId: "accessibility-extended",
          recordCount: 1,
          bridgeFile: "runners/benchmark-bridge/accessibility-extended.json",
          metrics: { criticalViolationCount: 1 },
          passed: false,
        },
      ],
    });

    expect(delta.families).toHaveLength(2);
    const security = delta.families.find((family) => family.sourceId === "security-baseline");
    expect(security?.delta.recordCount).toBe(-1);
    expect(security?.delta.metrics.missingHeaderCount).toBe(-2);
    expect(delta.headlines.some((line) => line.includes("-1 security benchmark record"))).toBe(true);
  });

  it("builds quality pack summary deltas", () => {
    const delta = buildQualityPackDelta({
      before: {
        headerFailures: 3,
        brokenLinks: 1,
        linksDiscovered: 10,
        linksStatus: "pass",
        bundleScanned: true,
        bundleFileCount: 5,
        healthErrors: 0,
        healthOk: 3,
        consoleErrorCombos: 0,
        consoleEventCount: 0,
        measureRuntimeErrors: 0,
        accessibilityCritical: 2,
        accessibilitySerious: 1,
        accessibilityRuntimeErrors: 0,
      },
      after: {
        headerFailures: 1,
        brokenLinks: 0,
        linksDiscovered: 10,
        linksStatus: "pass",
        bundleScanned: true,
        bundleFileCount: 5,
        healthErrors: 0,
        healthOk: 3,
        consoleErrorCombos: 0,
        consoleEventCount: 0,
        measureRuntimeErrors: 0,
        accessibilityCritical: 1,
        accessibilitySerious: 1,
        accessibilityRuntimeErrors: 0,
      },
    });

    expect(delta.delta.headerFailures).toBe(-2);
    expect(delta.delta.accessibilityCritical).toBe(-1);
    expect(delta.headlines.some((line) => line.includes("-2 header failure"))).toBe(true);
    expect(delta.headlines.some((line) => line.includes("-1 accessibility critical"))).toBe(true);
  });

  it("includes signal plane deltas in compare projection", async () => {
    const root = await mkdtemp(join(tmpdir(), "signaler-delta-plane-"));
    const baselineDir = resolve(root, "baseline");
    const compareDir = resolve(root, "compare");
    await mkdir(baselineDir, { recursive: true });
    await mkdir(compareDir, { recursive: true });

    const triageBase = {
      generatedAt: new Date().toISOString(),
      contractVersion: "v3",
      reportingModel: "issue-count",
      comparabilityHash: "cmp-1",
      mode: "throughput",
      options: { includeYellow: false },
      disclaimer: "test",
      categoryScores: { note: "test" },
    };

    for (const dir of [baselineDir, compareDir]) {
      await writeFile(
        resolve(dir, "run.json"),
        JSON.stringify({ schemaVersion: 1, protocol: { comparabilityHash: "cmp-1", mode: "throughput" } }),
        "utf8",
      );
    }

    await writeFile(
      resolve(baselineDir, "performance-triage.json"),
      JSON.stringify({ ...triageBase, totals: { red: 4, yellow: 0, green: 0, actionable: 4 }, uniqueIssues: [] }),
      "utf8",
    );
    await writeFile(
      resolve(compareDir, "performance-triage.json"),
      JSON.stringify({ ...triageBase, totals: { red: 2, yellow: 0, green: 0, actionable: 2 }, uniqueIssues: [] }),
      "utf8",
    );

    await writeFile(
      resolve(baselineDir, "quality-pack.json"),
      JSON.stringify({
        schemaVersion: 1,
        profile: "web-quality",
        passed: false,
        violations: [],
        evaluatedAt: new Date().toISOString(),
        summary: {
          headerFailures: 2,
          brokenLinks: 0,
          linksDiscovered: 5,
          linksStatus: "pass",
          bundleScanned: true,
          bundleFileCount: 1,
          healthErrors: 0,
          healthOk: 1,
          consoleErrorCombos: 0,
          consoleEventCount: 0,
          measureRuntimeErrors: 0,
          accessibilityCritical: 1,
          accessibilitySerious: 0,
          accessibilityRuntimeErrors: 0,
        },
        artifacts: {},
      }),
      "utf8",
    );
    await writeFile(
      resolve(compareDir, "quality-pack.json"),
      JSON.stringify({
        schemaVersion: 1,
        profile: "web-quality",
        passed: true,
        violations: [],
        evaluatedAt: new Date().toISOString(),
        summary: {
          headerFailures: 0,
          brokenLinks: 0,
          linksDiscovered: 5,
          linksStatus: "pass",
          bundleScanned: true,
          bundleFileCount: 1,
          healthErrors: 0,
          healthOk: 1,
          consoleErrorCombos: 0,
          consoleEventCount: 0,
          measureRuntimeErrors: 0,
          accessibilityCritical: 0,
          accessibilitySerious: 0,
          accessibilityRuntimeErrors: 0,
        },
        artifacts: {},
      }),
      "utf8",
    );

    const projection = await buildDeltaProjection({ dir: compareDir, baselineDir, compareDir });
    expect(projection.qualityPack?.delta.headerFailures).toBe(-2);
    expect(projection.qualityPack?.delta.accessibilityCritical).toBe(-1);
    expect(projection.headlines?.some((line) => line.includes("-2 header failure"))).toBe(true);
  });
});
