import { describe, expect, it } from "vitest";
import { buildPerformanceTriageV3 } from "../src/performance-triage.js";
import type { RunProtocolV3 } from "../src/engine-contracts/artifacts/v3/index.js";
import type { PageDeviceSummary } from "../src/core/types.js";
import {
  evaluateQualityGate,
  getQualityGateExitCode,
  isQualityGateActive,
} from "../src/quality-gate.js";

const protocol: RunProtocolV3 = {
  contractVersion: "v3",
  mode: "throughput",
  profile: "throughput-balanced",
  comparabilityHash: "test-hash",
  artifactProfile: "lean",
  options: { includeYellow: false },
};

function combo(overrides: Partial<PageDeviceSummary> = {}): PageDeviceSummary {
  return {
    url: "http://127.0.0.1:3000/",
    path: "/",
    label: "Home",
    device: "mobile",
    scores: { performance: 50, accessibility: 95, bestPractices: 95, seo: 95 },
    metrics: {},
    opportunities: [],
    failedAudits: [
      {
        id: "largest-contentful-paint",
        title: "LCP",
        description: "slow",
        score: 0.2,
        scoreDisplayMode: "numeric",
      },
    ],
    ...overrides,
  };
}

describe("quality gate", () => {
  it("fails when red perf issues exceed maxRedPerfIssues", () => {
    const triage = buildPerformanceTriageV3({
      results: [combo()],
      protocol,
      includeYellow: false,
    });
    const result = evaluateQualityGate({
      gate: { maxRedPerfIssues: 0 },
      triage,
    });
    expect(result.passed).toBe(false);
    expect(result.violations.some((v) => v.id === "max-red-perf-issues")).toBe(true);
  });

  it("passes when thresholds are met", () => {
    const triage = buildPerformanceTriageV3({
      results: [
        combo({
          failedAudits: [],
          scores: { performance: 99, accessibility: 95, bestPractices: 95, seo: 95 },
        }),
      ],
      protocol,
      includeYellow: true,
    });
    const result = evaluateQualityGate({
      gate: {
        maxRedPerfIssues: 5,
        minCategoryScores: { accessibility: 90, bestPractices: 90, seo: 90 },
      },
      triage,
    });
    expect(result.passed).toBe(true);
  });

  it("requires headers.json when requireHeadersPass is set", () => {
    const triage = buildPerformanceTriageV3({
      results: [combo({ failedAudits: [] })],
      protocol,
      includeYellow: false,
    });
    const result = evaluateQualityGate({
      gate: { requireHeadersPass: true },
      triage,
      headers: null,
    });
    expect(result.passed).toBe(false);
    expect(result.violations[0]?.id).toBe("headers-missing");
  });

  it("is active in CI when qualityGate block exists", () => {
    expect(isQualityGateActive({ maxRedPerfIssues: 0 }, { ci: true, failOnQualityGate: false })).toBe(
      true,
    );
    expect(
      isQualityGateActive({ enabled: false, maxRedPerfIssues: 0 }, { ci: true, failOnQualityGate: false }),
    ).toBe(false);
  });

  it("returns exit code 1 when gate fails under CI", () => {
    const triage = buildPerformanceTriageV3({
      results: [combo()],
      protocol,
      includeYellow: false,
    });
    const result = evaluateQualityGate({ gate: { maxRedPerfIssues: 0 }, triage });
    expect(
      getQualityGateExitCode(result, {
        ci: true,
        failOnQualityGate: false,
        gate: { maxRedPerfIssues: 0 },
      }),
    ).toBe(1);
  });
});
