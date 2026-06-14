import { describe, expect, it } from "vitest";
import {
  buildPerformanceTriageV3,
  classifyAuditSeverity,
  classifyOpportunitySeverity,
  trimResultsLineForMachineProfile,
} from "../src/performance-triage.js";
import type { PageDeviceSummary } from "../src/core/types.js";

describe("performance-triage", () => {
  it("classifies audit severities", () => {
    expect(classifyAuditSeverity({ score: 0.3, scoreDisplayMode: "numeric" })).toBe("red");
    expect(classifyAuditSeverity({ score: 0.7, scoreDisplayMode: "numeric" })).toBe("yellow");
    expect(classifyAuditSeverity({ score: 0.95, scoreDisplayMode: "numeric" })).toBe("green");
    expect(classifyAuditSeverity({ score: 0.5, scoreDisplayMode: "informative" })).toBeNull();
  });

  it("classifies opportunity severities and ignores zero-impact rows", () => {
    expect(classifyOpportunitySeverity({ estimatedSavingsMs: 600 })).toBe("red");
    expect(classifyOpportunitySeverity({ estimatedSavingsMs: 120 })).toBe("yellow");
    expect(classifyOpportunitySeverity({})).toBeNull();
  });

  it("builds issue-count triage with red-only mode", () => {
    const results: PageDeviceSummary[] = [
      {
        url: "http://127.0.0.1:3000/",
        path: "/",
        label: "Home",
        device: "mobile",
        scores: { performance: 40, accessibility: 95, seo: 90, bestPractices: 92 },
        metrics: {},
        opportunities: [{ id: "unused-javascript", title: "Reduce unused JavaScript", estimatedSavingsMs: 120 }],
        failedAudits: [
          {
            id: "largest-contentful-paint",
            title: "LCP",
            description: "",
            score: 0.3,
            scoreDisplayMode: "numeric",
          },
          {
            id: "uses-long-cache-ttl",
            title: "Cache",
            description: "",
            score: 0.7,
            scoreDisplayMode: "numeric",
          },
        ],
      },
    ];
    const triage = buildPerformanceTriageV3({
      results,
      protocol: {
        contractVersion: "v3",
        workflow: "init-run-review",
        mode: "throughput",
        profile: "throughput-balanced",
        throttlingMethod: "simulate",
        parallel: 2,
        sessionIsolation: "shared",
        throughputBackoff: "auto",
        warmUp: true,
        headless: true,
        runsPerCombo: 1,
        captureLevel: "none",
        comparabilityHash: "cmp-1",
        disclaimer: "test",
      },
      includeYellow: false,
    });
    expect(triage.reportingModel).toBe("issue-count");
    expect(triage.totals.red).toBeGreaterThan(0);
    expect(triage.totals.yellow).toBe(0);
    expect(triage.uniqueIssues.every((issue) => issue.severity === "red")).toBe(true);
    expect(triage.combos).toHaveLength(1);
    expect(triage.combos[0]?.counts.red).toBeGreaterThan(0);
    expect(triage.combos[0]?.issues.length).toBeGreaterThan(0);
    expect(triage.combos[0]?.auditStatus).toBe("scored");
    expect(triage.coverage.scored).toBe(1);
    expect(triage.coverage.artifact).toBe("coverage.json");
  });

  it("trims lean results lines", () => {
    const trimmed = trimResultsLineForMachineProfile({
      artifactProfile: "lean",
      perfIncludeYellow: false,
      line: {
        label: "Home",
        path: "/",
        url: "http://127.0.0.1:3000/",
        device: "mobile",
        scores: {},
        metrics: {},
        opportunities: [
          { id: "a", title: "A", estimatedSavingsMs: 0 },
          { id: "b", title: "B", estimatedSavingsMs: 100 },
          { id: "c", title: "C", estimatedSavingsMs: 200 },
          { id: "d", title: "D", estimatedSavingsMs: 300 },
          { id: "e", title: "E", estimatedSavingsMs: 400 },
          { id: "f", title: "F", estimatedSavingsMs: 500 },
          { id: "g", title: "G", estimatedSavingsMs: 600 },
        ],
        failedAudits: [],
      },
    });
    expect(trimmed.opportunities).toHaveLength(5);
    expect(trimmed.opportunities.every((o) => (o.estimatedSavingsMs ?? 0) > 0)).toBe(true);
  });
});
