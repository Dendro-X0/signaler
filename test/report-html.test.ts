import { describe, expect, it } from "vitest";
import { buildHtmlReport } from "../src/report-html.js";
import type { RunSummary } from "../src/types.js";

describe("report-html dashboard", () => {
  it("renders dashboard shell, KPIs, overview table, filters, and sorted cards", () => {
    const summary: RunSummary = {
      meta: {
        configPath: "signaler.config.json",
        startedAt: new Date().toISOString(),
        completedAt: new Date().toISOString(),
        elapsedMs: 120_000,
        averageStepMs: 4000,
        totalSteps: 2,
        comboCount: 3,
        executedCombos: 2,
        cachedCombos: 1,
        runsPerCombo: 1,
        executedSteps: 2,
        cachedSteps: 1,
        warmUp: true,
        throttlingMethod: "simulate",
        cpuSlowdownMultiplier: 4,
        resolvedParallel: 6,
        incremental: false,
      },
      results: [
        {
          url: "http://127.0.0.1:3000/",
          path: "/",
          label: "home",
          device: "mobile",
          scores: { performance: 78, accessibility: 100, bestPractices: 100, seo: 100 },
          metrics: { lcpMs: 1600, fcpMs: 1200, tbtMs: 900, cls: 0.004 },
          opportunities: [{ id: "unused-javascript", title: "Reduce unused JavaScript", estimatedSavingsMs: 500 }],
          failedAudits: [],
        },
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
        {
          url: "http://127.0.0.1:3000/search",
          path: "/search",
          label: "search",
          device: "desktop",
          scores: { performance: 30, accessibility: 100, bestPractices: 100, seo: 100 },
          metrics: { lcpMs: 3200, tbtMs: 700, cls: 0.2 },
          opportunities: [],
          failedAudits: [],
        },
      ],
    };
    const html = buildHtmlReport(summary, "throughput");
    expect(html).toContain("Signaler Dashboard");
    expect(html).toContain("Median LCP");
    expect(html).toContain("Red issues");
    expect(html).toContain("focus-worst 5");
    expect(html).toContain("Actionable triage");
    expect(html).toContain("Route overview");
    expect(html).toContain('id="search"');
    expect(html).toContain("Show skipped");
    expect(html).toContain("status-skipped");
    expect(html.indexOf('data-path="/search"')).toBeLessThan(html.indexOf('data-path="/"'));
  });
});
