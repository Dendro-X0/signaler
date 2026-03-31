import { describe, expect, it } from "vitest";
import {
  buildAccessibilityBenchmarkSignalsFromSummary,
  deriveIssueMappingFromIssuesJson,
  resolveAccessibilitySummarySourcePath,
} from "../src/accessibility-benchmark-signals.js";

describe("accessibility benchmark signal adapter", () => {
  it("derives route mapping and default issue id from issues.json-like payload", () => {
    const mapping = deriveIssueMappingFromIssuesJson({
      topIssues: [
        { id: "unused-javascript", title: "Reduce unused JavaScript", count: 4, totalMs: 1000 },
        { id: "server-response-time", title: "Reduce server response time", count: 2, totalMs: 400 },
      ],
      failing: [
        {
          path: "/",
          topOpportunities: [{ id: "server-response-time", title: "Reduce server response time" }],
        },
        {
          path: "/docs",
          topOpportunities: [{ id: "unused-javascript", title: "Reduce unused JavaScript" }],
        },
      ],
    });
    expect(mapping.defaultIssueId).toBe("unused-javascript");
    expect(mapping.routeIssueIdByPath["/"]).toBe("server-response-time");
    expect(mapping.routeIssueIdByPath["/docs"]).toBe("unused-javascript");
  });

  it("builds accessibility-extended fixture with wcag/apg metrics and stable evidence pointers", () => {
    const fixture = buildAccessibilityBenchmarkSignalsFromSummary({
      summary: {
        meta: {
          configPath: "signaler.config.json",
          comboCount: 2,
          startedAt: "2026-03-30T00:00:00.000Z",
          completedAt: "2026-03-30T00:01:00.000Z",
          elapsedMs: 60_000,
        },
        results: [
          {
            url: "http://localhost:3000/",
            path: "/",
            label: "Home",
            device: "desktop",
            violations: [
              { id: "aria-required-parent", impact: "serious", nodes: [{}, {}] },
              { id: "focus-visible", impact: "critical", nodes: [{}] },
              { id: "target-size", impact: "serious", nodes: [{}, {}, {}] },
              { id: "keyboard", impact: "serious", nodes: [{}] },
            ],
          },
          {
            url: "http://localhost:3000/docs",
            path: "/docs",
            label: "Docs",
            device: "mobile",
            violations: [],
            runtimeErrorMessage: "navigation timeout",
          },
        ],
      },
      sourceRelPath: ".signaler/accessibility-summary.json",
      defaultIssueId: "unused-javascript",
      routeIssueIdByPath: {
        "/": "server-response-time",
      },
    });

    expect(fixture.schemaVersion).toBe(1);
    expect(fixture.sources.length).toBe(1);
    expect(fixture.sources[0]?.sourceId).toBe("accessibility-extended");
    expect(fixture.sources[0]?.collectedAt).toBe("2026-03-30T00:01:00.000Z");
    expect(fixture.sources[0]?.records.length).toBe(1);

    const record = fixture.sources[0]?.records[0];
    expect(record?.target.issueId).toBe("server-response-time");
    expect(record?.target.path).toBe("/");
    expect(record?.target.device).toBe("desktop");
    expect(record?.confidence).toBe("high");
    expect(record?.evidence[0]).toMatchObject({
      sourceRelPath: ".signaler/accessibility-summary.json",
      pointer: "/results/0",
      artifactRelPath: "accessibility/page_desktop_axe.json",
    });
    expect(record?.metrics).toMatchObject({
      wcagViolationCount: 7,
      seriousViolationCount: 6,
      criticalViolationCount: 1,
      ariaPatternMismatchCount: 2,
      focusAppearanceIssueCount: 1,
      targetSizeIssueCount: 3,
      apgPatternMismatchCount: 2,
      keyboardSupportIssueCount: 1,
    });
  });

  it("throws for malformed accessibility summary payloads", () => {
    expect(() =>
      buildAccessibilityBenchmarkSignalsFromSummary({
        summary: { meta: { completedAt: "invalid" }, results: [] } as never,
        sourceRelPath: ".signaler/accessibility-summary.json",
        defaultIssueId: "unused-javascript",
      }),
    ).toThrow("Invalid meta.completedAt");
  });

  it("normalizes summary source path relative to cwd when possible", () => {
    const value = resolveAccessibilitySummarySourcePath("src/../src/accessibility-types.ts");
    expect(value.includes("\\")).toBe(false);
    expect(value.endsWith("src/accessibility-types.ts")).toBe(true);
  });
});

