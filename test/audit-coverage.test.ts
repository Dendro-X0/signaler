import { describe, expect, it } from "vitest";
import { buildAuditCoverageV1, isAuditCoverageV1 } from "../src/audit-coverage.js";
import { classifyComboAuditStatus } from "../src/runners/lighthouse/route-preflight.js";
import type { PageDeviceSummary } from "../src/core/types.js";

describe("audit coverage artifacts", () => {
  it("classifies combo audit status", () => {
    expect(
      classifyComboAuditStatus({
        runtimeErrorMessage: "Skipped (auth-wall): /settings — redirected to /auth/login",
        scores: {},
      }),
    ).toBe("skipped-auth");
    expect(
      classifyComboAuditStatus({
        runtimeErrorMessage: "Skipped (unreachable): /terms — server error page",
        scores: {},
      }),
    ).toBe("skipped-unreachable");
    expect(classifyComboAuditStatus({ scores: { performance: 42 } })).toBe("scored");
  });

  it("builds coverage.json payload with skipped routes and guidance", () => {
    const results: PageDeviceSummary[] = [
      {
        url: "http://127.0.0.1:3000/settings",
        path: "/settings",
        label: "settings",
        device: "mobile",
        scores: {},
        metrics: {},
        opportunities: [],
        failedAudits: [],
        runtimeErrorMessage: "Skipped (auth-wall): /settings — redirected to /auth/login",
      },
      {
        url: "http://127.0.0.1:3000/",
        path: "/",
        label: "home",
        device: "mobile",
        scores: { performance: 40, accessibility: 95, seo: 90, bestPractices: 92 },
        metrics: {},
        opportunities: [],
        failedAudits: [],
      },
    ];
    const coverage = buildAuditCoverageV1({
      results,
      meta: {
        configPath: "signaler.config.json",
        resolvedParallel: 6,
        totalSteps: 2,
        comboCount: 2,
        executedCombos: 1,
        cachedCombos: 1,
        runsPerCombo: 1,
        executedSteps: 1,
        cachedSteps: 1,
        warmUp: false,
        throttlingMethod: "simulate",
        cpuSlowdownMultiplier: 4,
        startedAt: new Date().toISOString(),
        completedAt: new Date().toISOString(),
        elapsedMs: 1000,
        averageStepMs: 500,
        scoreCoverage: {
          scored: 1,
          total: 2,
          skipped: 1,
          expectedToScore: 1,
          rate: 1,
        },
      },
    });
    expect(isAuditCoverageV1(coverage)).toBe(true);
    expect(coverage.totals.skippedAuth).toBe(1);
    expect(coverage.totals.scored).toBe(1);
    expect(coverage.skippedByReason.authWall).toHaveLength(1);
    expect(coverage.guidance.unreachable).toContain("server logs");
  });
});
