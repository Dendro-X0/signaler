import { describe, expect, it } from "vitest";
import { evaluateBaselineCompare } from "../src/baseline-compare.js";
import type { DeltaProjection } from "../src/query-delta.js";

const baseDelta: DeltaProjection = {
  view: "delta",
  source: "compare",
  comparability: {
    matched: true,
    baselineDir: "/baseline",
    compareDir: "/compare",
    baselineHash: "hash-a",
    compareHash: "hash-a",
    warnings: [],
  },
  performance: {
    before: { red: 2, yellow: 0, actionable: 2 },
    after: { red: 5, yellow: 0, actionable: 5 },
    delta: { red: 3, yellow: 0, actionable: 3 },
  },
};

describe("baseline compare", () => {
  it("fails when red issues increase beyond maxRedIncrease", () => {
    const result = evaluateBaselineCompare({
      config: { maxRedIncrease: 0 },
      delta: baseDelta,
    });
    expect(result.passed).toBe(false);
    expect(result.violations.some((v) => v.id === "baseline-red-regression")).toBe(true);
  });

  it("fails on comparability mismatch when required", () => {
    const result = evaluateBaselineCompare({
      config: { maxRedIncrease: 99, requireComparabilityMatch: true },
      delta: {
        ...baseDelta,
        comparability: {
          ...baseDelta.comparability!,
          matched: false,
          warnings: ["hash mismatch"],
        },
      },
    });
    expect(result.passed).toBe(false);
    expect(result.violations.some((v) => v.id === "comparability-mismatch")).toBe(true);
  });

  it("passes when regression is within policy", () => {
    const result = evaluateBaselineCompare({
      config: { maxRedIncrease: 5 },
      delta: baseDelta,
    });
    expect(result.passed).toBe(true);
  });

  it("fails when benchmark family records increase beyond policy", () => {
    const result = evaluateBaselineCompare({
      config: { maxRedIncrease: 99, benchmarkFamilies: { maxRecordIncrease: 0 } },
      delta: {
        ...baseDelta,
        benchmarkSignals: {
          families: [
            {
              sourceId: "security-baseline",
              before: { recordCount: 1, metrics: {} },
              after: { recordCount: 3, metrics: {} },
              delta: { recordCount: 2, metrics: {} },
            },
          ],
          headlines: ["+2 security benchmark record(s)"],
        },
      },
    });
    expect(result.passed).toBe(false);
    expect(result.violations.some((v) => v.id === "baseline-benchmark-security-baseline-regression")).toBe(true);
  });

  it("fails when quality pack header failures increase beyond policy", () => {
    const result = evaluateBaselineCompare({
      config: { maxRedIncrease: 99, qualityPack: { maxHeaderFailureIncrease: 0 } },
      delta: {
        ...baseDelta,
        qualityPack: {
          before: {
            headerFailures: 0,
            brokenLinks: 0,
            linksDiscovered: 0,
            linksStatus: "pass",
            bundleScanned: false,
            bundleFileCount: 0,
            healthErrors: 0,
            healthOk: 0,
            consoleErrorCombos: 0,
            consoleEventCount: 0,
            measureRuntimeErrors: 0,
            accessibilityCritical: 0,
            accessibilitySerious: 0,
            accessibilityRuntimeErrors: 0,
          },
          after: {
            headerFailures: 2,
            brokenLinks: 0,
            linksDiscovered: 0,
            linksStatus: "pass",
            bundleScanned: false,
            bundleFileCount: 0,
            healthErrors: 0,
            healthOk: 0,
            consoleErrorCombos: 0,
            consoleEventCount: 0,
            measureRuntimeErrors: 0,
            accessibilityCritical: 0,
            accessibilitySerious: 0,
            accessibilityRuntimeErrors: 0,
          },
          delta: {
            headerFailures: 2,
            brokenLinks: 0,
            healthErrors: 0,
            consoleErrorCombos: 0,
            measureRuntimeErrors: 0,
            accessibilityCritical: 0,
            accessibilitySerious: 0,
          },
          headlines: ["+2 header failure(s)"],
        },
      },
    });
    expect(result.passed).toBe(false);
    expect(result.violations.some((v) => v.id === "baseline-quality-pack-header-regression")).toBe(true);
  });
});
