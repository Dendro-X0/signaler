import { describe, expect, it } from "vitest";
import {
  buildReliabilityBenchmarkSignalsFromHealthReport,
  deriveIssueMappingFromIssuesJson,
  resolveReliabilityHealthSourcePath,
} from "../src/reliability-benchmark-signals.js";

describe("reliability benchmark signal adapter", () => {
  it("derives route mapping and default issue id from issues.json-like payload", () => {
    const mapping = deriveIssueMappingFromIssuesJson({
      topIssues: [{ id: "unused-javascript", title: "Reduce unused JavaScript", count: 3, totalMs: 800 }],
      failing: [{ path: "/", topOpportunities: [{ id: "server-response-time", title: "Reduce server response time" }] }],
    });
    expect(mapping.defaultIssueId).toBe("unused-javascript");
    expect(mapping.routeIssueIdByPath["/"]).toBe("server-response-time");
  });

  it("builds reliability-slo fixture with availability/error/latency metrics", () => {
    const fixture = buildReliabilityBenchmarkSignalsFromHealthReport({
      report: {
        meta: {
          completedAt: "2026-03-30T00:03:00.000Z",
        },
        results: [
          {
            path: "/",
            url: "https://example.com/",
            statusCode: 503,
            totalMs: 920,
          },
          {
            path: "/blog",
            url: "https://example.com/blog",
            statusCode: 200,
            totalMs: 210,
          },
        ],
      },
      sourceRelPath: ".signaler/health.json",
      defaultIssueId: "unused-javascript",
      routeIssueIdByPath: {
        "/": "server-response-time",
      },
      minLatencyMs: 500,
    });

    expect(fixture.schemaVersion).toBe(1);
    expect(fixture.sources.length).toBe(1);
    expect(fixture.sources[0]?.sourceId).toBe("reliability-slo");
    expect(fixture.sources[0]?.records.length).toBe(1);

    const record = fixture.sources[0]?.records[0];
    expect(record?.target.issueId).toBe("server-response-time");
    expect(record?.target.path).toBe("/");
    expect(record?.evidence[0]).toMatchObject({
      sourceRelPath: ".signaler/health.json",
      pointer: "/results/0",
      artifactRelPath: "health.json",
    });
    expect(record?.metrics).toMatchObject({
      availabilityPct: 0,
      errorRatePct: 100,
      latencyP95Ms: 920,
    });
  });

  it("throws for malformed health report payload", () => {
    expect(() =>
      buildReliabilityBenchmarkSignalsFromHealthReport({
        report: { meta: { completedAt: "invalid" }, results: [] },
        sourceRelPath: ".signaler/health.json",
        defaultIssueId: "unused-javascript",
      }),
    ).toThrow("Invalid meta.completedAt");
  });

  it("normalizes health source path relative to cwd when possible", () => {
    const value = resolveReliabilityHealthSourcePath("src/../src/health-cli.ts");
    expect(value.includes("\\")).toBe(false);
    expect(value.endsWith("src/health-cli.ts")).toBe(true);
  });
});

