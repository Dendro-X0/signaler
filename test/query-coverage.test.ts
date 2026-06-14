import { describe, expect, it } from "vitest";
import { buildAuditCoverageV1 } from "../src/audit-coverage.js";
import { buildCandidateDraftsFromAuditCoverage } from "../src/analyze-audit-coverage.js";
import { buildCoverageProjection } from "../src/query-coverage.js";
import type { PageDeviceSummary } from "../src/core/types.js";

describe("query and analyze coverage integration", () => {
  it("builds coverage projection for query --view coverage", () => {
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
        url: "http://127.0.0.1:3000/settings",
        path: "/settings",
        label: "settings",
        device: "desktop",
        scores: {},
        metrics: {},
        opportunities: [],
        failedAudits: [],
        runtimeErrorMessage: "Skipped (auth-wall): /settings — redirected to /auth/login",
      },
    ];
    const coverage = buildAuditCoverageV1({
      results,
      meta: {
        configPath: "signaler.config.json",
        resolvedParallel: 6,
        totalSteps: 2,
        comboCount: 2,
        executedCombos: 0,
        cachedCombos: 2,
        runsPerCombo: 1,
        executedSteps: 0,
        cachedSteps: 2,
        warmUp: false,
        throttlingMethod: "simulate",
        cpuSlowdownMultiplier: 4,
        startedAt: new Date().toISOString(),
        completedAt: new Date().toISOString(),
        elapsedMs: 1000,
        averageStepMs: 500,
      },
    });
    const projection = buildCoverageProjection({ coverage, top: 10 });
    expect(projection.view).toBe("coverage");
    expect(projection.totals.skippedAuth).toBe(2);
    expect(projection.skippedByReason.authWall).toHaveLength(2);
  });

  it("builds analyze reliability actions with coverage.json evidence", () => {
    const results: PageDeviceSummary[] = [
      {
        url: "http://127.0.0.1:3000/terms",
        path: "/terms",
        label: "terms",
        device: "mobile",
        scores: {},
        metrics: {},
        opportunities: [],
        failedAudits: [],
        runtimeErrorMessage: "Skipped (unreachable): /terms — server error page",
      },
    ];
    const coverage = buildAuditCoverageV1({
      results,
      meta: {
        configPath: "signaler.config.json",
        resolvedParallel: 1,
        totalSteps: 1,
        comboCount: 1,
        executedCombos: 0,
        cachedCombos: 1,
        runsPerCombo: 1,
        executedSteps: 0,
        cachedSteps: 1,
        warmUp: false,
        throttlingMethod: "simulate",
        cpuSlowdownMultiplier: 4,
        startedAt: new Date().toISOString(),
        completedAt: new Date().toISOString(),
        elapsedMs: 500,
        averageStepMs: 500,
      },
    });
    const drafts = buildCandidateDraftsFromAuditCoverage({ coverage });
    expect(drafts).toHaveLength(1);
    expect(drafts[0]?.category).toBe("reliability");
    expect(drafts[0]?.baseEvidence[0]?.artifactRelPath).toBe("coverage.json");
    expect(drafts[0]?.baseEvidence[0]?.pointer).toContain("coverage.json#/skippedByReason/unreachable/");
  });
});
