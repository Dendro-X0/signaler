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
});
