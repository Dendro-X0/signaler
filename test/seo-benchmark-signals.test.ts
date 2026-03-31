import { describe, expect, it } from "vitest";
import {
  buildSeoBenchmarkSignalsFromArtifacts,
  deriveIssueMappingFromIssuesJson,
  resolveSeoLinksSourcePath,
  resolveSeoResultsSourcePath,
} from "../src/seo-benchmark-signals.js";

describe("seo benchmark signal adapter", () => {
  it("derives route mapping and default issue id from issues.json-like payload", () => {
    const mapping = deriveIssueMappingFromIssuesJson({
      topIssues: [{ id: "unused-javascript", title: "Reduce unused JavaScript", count: 2, totalMs: 700 }],
      failing: [{ path: "/", topOpportunities: [{ id: "server-response-time", title: "Reduce server response time" }] }],
    });
    expect(mapping.defaultIssueId).toBe("unused-javascript");
    expect(mapping.routeIssueIdByPath["/"]).toBe("server-response-time");
  });

  it("builds seo-technical fixture from results + links artifacts", () => {
    const fixture = buildSeoBenchmarkSignalsFromArtifacts({
      resultsReport: {
        generatedAt: "2026-03-30T00:04:00.000Z",
        meta: {
          completedAt: "2026-03-30T00:05:00.000Z",
        },
        results: [
          {
            path: "/",
            url: "https://example.com/",
            device: "desktop",
            failedAudits: [
              { id: "canonical" },
              { id: "structured-data" },
              { id: "is-crawlable" },
            ],
          },
          {
            path: "/docs",
            url: "https://example.com/docs",
            device: "mobile",
            failedAudits: [],
            runtimeErrorMessage: "navigation timeout",
          },
        ],
      },
      linksReport: {
        results: [
          { url: "https://example.com/", statusCode: 404 },
          { url: "https://example.com/docs", runtimeErrorMessage: "Timed out" },
        ],
      },
      sourceRelPath: ".signaler/results.json",
      linksSourceRelPath: ".signaler/links.json",
      defaultIssueId: "unused-javascript",
      routeIssueIdByPath: {
        "/": "server-response-time",
      },
    });

    expect(fixture.schemaVersion).toBe(1);
    expect(fixture.sources.length).toBe(1);
    expect(fixture.sources[0]?.sourceId).toBe("seo-technical");
    expect(fixture.sources[0]?.records.length).toBe(2);

    const first = fixture.sources[0]?.records[0];
    expect(first?.target.issueId).toBe("server-response-time");
    expect(first?.target.path).toBe("/");
    expect(first?.target.device).toBe("desktop");
    expect(first?.metrics).toMatchObject({
      indexabilityIssueCount: 3,
      canonicalMismatchCount: 1,
      structuredDataErrorCount: 1,
      crawlabilityIssueCount: 2,
    });
    expect(first?.evidence.length).toBe(2);

    const second = fixture.sources[0]?.records[1];
    expect(second?.target.issueId).toBe("unused-javascript");
    expect(second?.target.path).toBe("/docs");
    expect(second?.target.device).toBe("mobile");
    expect(second?.metrics).toMatchObject({
      indexabilityIssueCount: 1,
      crawlabilityIssueCount: 2,
    });
  });

  it("throws for malformed results payload", () => {
    expect(() =>
      buildSeoBenchmarkSignalsFromArtifacts({
        resultsReport: { generatedAt: "bad", results: [] },
        sourceRelPath: ".signaler/results.json",
        defaultIssueId: "unused-javascript",
      }),
    ).toThrow("collectedAt");
  });

  it("normalizes source paths relative to cwd when possible", () => {
    const resultsPath = resolveSeoResultsSourcePath("src/../src/cli.ts");
    const linksPath = resolveSeoLinksSourcePath("src/../src/links-cli.ts");
    expect(resultsPath.includes("\\")).toBe(false);
    expect(linksPath.includes("\\")).toBe(false);
    expect(resultsPath.endsWith("src/cli.ts")).toBe(true);
    expect(linksPath.endsWith("src/links-cli.ts")).toBe(true);
  });
});
