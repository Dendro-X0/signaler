import { describe, expect, it } from "vitest";
import {
  buildCrossBrowserBenchmarkSignalsFromSnapshots,
  deriveIssueMappingFromIssuesJson,
  resolveCrossBrowserSnapshotsSourcePath,
} from "../src/cross-browser-benchmark-signals.js";

describe("cross-browser benchmark signal adapter", () => {
  it("derives route mapping and default issue id from issues.json-like payload", () => {
    const mapping = deriveIssueMappingFromIssuesJson({
      topIssues: [{ id: "unused-javascript", title: "Reduce unused JavaScript", count: 2, totalMs: 700 }],
      failing: [{ path: "/", topOpportunities: [{ id: "largest-contentful-paint", title: "Improve LCP" }] }],
    });
    expect(mapping.defaultIssueId).toBe("unused-javascript");
    expect(mapping.routeIssueIdByPath["/"]).toBe("largest-contentful-paint");
  });

  it("builds cross-browser-parity fixture from snapshot report with thresholded records", () => {
    const fixture = buildCrossBrowserBenchmarkSignalsFromSnapshots({
      report: {
        collectedAt: "2026-03-30T10:00:00.000Z",
        snapshots: [
          {
            path: "/",
            device: "mobile",
            browser: "chromium",
            performanceScore: 44,
            metrics: { lcpMs: 3100, cls: 0.11 },
          },
          {
            path: "/",
            device: "mobile",
            browser: "firefox",
            performanceScore: 62,
            metrics: { lcpMs: 2300, cls: 0.04 },
          },
          {
            path: "/docs",
            device: "desktop",
            browser: "chromium",
            performanceScore: 85,
            metrics: { lcpMs: 1800, cls: 0.03 },
          },
          {
            path: "/docs",
            device: "desktop",
            browser: "webkit",
            performanceScore: 86,
            metrics: { lcpMs: 1840, cls: 0.04 },
          },
        ],
      },
      sourceRelPath: ".signaler/cross-browser-snapshots.json",
      defaultIssueId: "unused-javascript",
      routeIssueIdByPath: {
        "/": "largest-contentful-paint",
      },
      minScoreVariancePct: 5,
      minLcpDeltaMs: 250,
      minClsDelta: 0.05,
    });

    expect(fixture.schemaVersion).toBe(1);
    expect(fixture.sources[0]?.sourceId).toBe("cross-browser-parity");
    expect(fixture.sources[0]?.records.length).toBe(1);

    const first = fixture.sources[0]?.records[0];
    expect(first?.target.issueId).toBe("largest-contentful-paint");
    expect(first?.target.path).toBe("/");
    expect(first?.target.device).toBe("mobile");
    expect(first?.metrics).toMatchObject({
      scoreVariancePct: 18,
      lcpDeltaMs: 800,
      clsDelta: 0.07,
    });
    expect(first?.evidence.length).toBe(2);
  });

  it("includes runtime-error parity records even when metric deltas are unavailable", () => {
    const fixture = buildCrossBrowserBenchmarkSignalsFromSnapshots({
      report: {
        generatedAt: "2026-03-30T10:00:00.000Z",
        snapshots: [
          {
            path: "/checkout",
            device: "desktop",
            browser: "chromium",
            runtimeErrorMessage: "net::ERR_ABORTED",
          },
          {
            path: "/checkout",
            device: "desktop",
            browser: "firefox",
          },
        ],
      },
      sourceRelPath: ".signaler/cross-browser-snapshots.json",
      defaultIssueId: "server-response-time",
      minScoreVariancePct: 5,
    });

    expect(fixture.sources[0]?.records.length).toBe(1);
    const record = fixture.sources[0]?.records[0];
    expect(record?.target.path).toBe("/checkout");
    expect(record?.metrics?.scoreVariancePct).toBe(5);
  });

  it("throws for malformed snapshot payload", () => {
    expect(() =>
      buildCrossBrowserBenchmarkSignalsFromSnapshots({
        report: { collectedAt: "invalid", snapshots: [] },
        sourceRelPath: ".signaler/cross-browser-snapshots.json",
        defaultIssueId: "unused-javascript",
      }),
    ).toThrow("collectedAt");
  });

  it("normalizes source path relative to cwd when possible", () => {
    const value = resolveCrossBrowserSnapshotsSourcePath("src/../src/bin.ts");
    expect(value.includes("\\")).toBe(false);
    expect(value.endsWith("src/bin.ts")).toBe(true);
  });
});
