import { describe, expect, it } from "vitest";
import {
  buildSecurityBenchmarkSignalsFromHeadersReport,
  deriveIssueMappingFromIssuesJson,
  resolveSecurityHeadersSourcePath,
} from "../src/security-benchmark-signals.js";

describe("security benchmark signal adapter", () => {
  it("derives route mapping and default issue id from issues.json-like payload", () => {
    const mapping = deriveIssueMappingFromIssuesJson({
      topIssues: [
        { id: "unused-javascript", title: "Reduce unused JavaScript", count: 4, totalMs: 1000 },
      ],
      failing: [
        {
          path: "/",
          topOpportunities: [{ id: "server-response-time", title: "Reduce server response time" }],
        },
      ],
    });
    expect(mapping.defaultIssueId).toBe("unused-javascript");
    expect(mapping.routeIssueIdByPath["/"]).toBe("server-response-time");
  });

  it("builds security-baseline fixture with policy metrics and evidence pointers", () => {
    const fixture = buildSecurityBenchmarkSignalsFromHeadersReport({
      report: {
        meta: {
          baseUrl: "https://example.com",
          completedAt: "2026-03-30T00:02:00.000Z",
        },
        results: [
          {
            path: "/",
            url: "https://example.com/",
            statusCode: 200,
            missing: ["strict-transport-security", "content-security-policy", "permissions-policy"],
            present: ["x-content-type-options", "x-frame-options", "referrer-policy"],
          },
          {
            path: "/broken",
            url: "https://example.com/broken",
            missing: ["content-security-policy"],
            present: [],
            runtimeErrorMessage: "Timed out after 20000ms",
          },
        ],
      },
      sourceRelPath: ".signaler/headers.json",
      defaultIssueId: "unused-javascript",
      routeIssueIdByPath: {
        "/": "server-response-time",
      },
    });

    expect(fixture.schemaVersion).toBe(1);
    expect(fixture.sources.length).toBe(1);
    expect(fixture.sources[0]?.sourceId).toBe("security-baseline");
    expect(fixture.sources[0]?.records.length).toBe(2);

    const first = fixture.sources[0]?.records[0];
    expect(first?.target.issueId).toBe("server-response-time");
    expect(first?.target.path).toBe("/");
    expect(first?.evidence[0]).toMatchObject({
      sourceRelPath: ".signaler/headers.json",
      pointer: "/results/0",
      artifactRelPath: "headers.json",
    });
    expect(first?.metrics).toMatchObject({
      missingHeaderCount: 3,
      tlsConfigIssueCount: 1,
      cookiePolicyIssueCount: 2,
    });

    const second = fixture.sources[0]?.records[1];
    expect(second?.target.issueId).toBe("unused-javascript");
    expect(second?.target.path).toBe("/broken");
  });

  it("throws for malformed headers report payload", () => {
    expect(() =>
      buildSecurityBenchmarkSignalsFromHeadersReport({
        report: { meta: { completedAt: "invalid" }, results: [] },
        sourceRelPath: ".signaler/headers.json",
        defaultIssueId: "unused-javascript",
      }),
    ).toThrow("Invalid meta.completedAt");
  });

  it("normalizes headers source path relative to cwd when possible", () => {
    const value = resolveSecurityHeadersSourcePath("src/../src/headers-cli.ts");
    expect(value.includes("\\")).toBe(false);
    expect(value.endsWith("src/headers-cli.ts")).toBe(true);
  });
});

