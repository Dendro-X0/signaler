import { describe, expect, it } from "vitest";
import { buildDiscoveryCoverage, formatDiscoveryCoverageLine } from "../src/discovery-coverage.js";

describe("discovery-coverage", () => {
  it("computes audited coverage and recommends full scope for quick under 50%", () => {
    const coverage = buildDiscoveryCoverage({
      detected: 43,
      selected: 12,
      excludedDynamic: 3,
      excludedByFilter: 0,
      excludedByScope: 28,
      scopeResolved: "quick",
    });
    expect(coverage.auditedCoveragePct).toBe(28);
    expect(coverage.excludedReasons).toEqual({ scope: 28, filter: 0, dynamic: 3 });
    expect(coverage.recommendFullScope).toBe(true);
    expect(
      formatDiscoveryCoverageLine({ detected: 43, selected: 12, coverage }),
    ).toBe("auditing 12/43 routes (28%)");
  });

  it("does not recommend full scope when coverage is adequate", () => {
    const coverage = buildDiscoveryCoverage({
      detected: 10,
      selected: 8,
      excludedDynamic: 0,
      excludedByFilter: 2,
      excludedByScope: 0,
      scopeResolved: "quick",
    });
    expect(coverage.recommendFullScope).toBe(false);
  });
});
