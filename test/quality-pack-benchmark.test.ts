import { describe, expect, it } from "vitest";
import {
  evaluateBenchmarkFamilyGates,
  summarizeBenchmarkBridgeFixtures,
} from "../src/quality-pack-benchmark.js";

describe("quality pack benchmark signals", () => {
  it("summarizes bridge fixtures with aggregated metrics", () => {
    const families = summarizeBenchmarkBridgeFixtures({
      fixtures: [
        {
          schemaVersion: 1,
          sources: [
            {
              sourceId: "security-baseline",
              collectedAt: "2026-03-30T00:00:00.000Z",
              records: [
                {
                  id: "sec-1",
                  target: { issueId: "unused-javascript", path: "/" },
                  confidence: "high",
                  evidence: [{ sourceRelPath: "headers.json", pointer: "/results/0" }],
                  metrics: { missingHeaderCount: 3, tlsConfigIssueCount: 1 },
                },
              ],
            },
          ],
        },
      ],
    });

    expect(families).toHaveLength(1);
    expect(families[0]?.sourceId).toBe("security-baseline");
    expect(families[0]?.recordCount).toBe(1);
    expect(families[0]?.metrics.missingHeaderCount).toBe(3);
  });

  it("evaluates benchmark family gates using inherited runner limits", () => {
    const families = summarizeBenchmarkBridgeFixtures({
      fixtures: [
        {
          schemaVersion: 1,
          sources: [
            {
              sourceId: "security-baseline",
              collectedAt: "2026-03-30T00:00:00.000Z",
              records: [
                {
                  id: "sec-1",
                  target: { issueId: "unused-javascript", path: "/" },
                  confidence: "high",
                  evidence: [{ sourceRelPath: "headers.json", pointer: "/results/0" }],
                  metrics: { missingHeaderCount: 2 },
                },
              ],
            },
          ],
        },
      ],
    });

    const result = evaluateBenchmarkFamilyGates({
      families,
      runnerLimits: {
        maxHeaderFailures: 0,
        maxBrokenLinks: 0,
        maxHealthErrors: 0,
        maxAccessibilityCriticalViolations: 0,
        maxAccessibilitySeriousViolations: 0,
      },
    });
    expect(result.violations.map((v) => v.id)).toContain("benchmark-security-baseline-max-records");
    expect(result.violations.map((v) => v.id)).toContain("benchmark-security-max-missing-headers");
    expect(result.families[0]?.passed).toBe(false);
  });

  it("passes benchmark family gates when metrics are within explicit overrides", () => {
    const families = summarizeBenchmarkBridgeFixtures({
      fixtures: [
        {
          schemaVersion: 1,
          sources: [
            {
              sourceId: "accessibility-extended",
              collectedAt: "2026-03-30T00:00:00.000Z",
              records: [
                {
                  id: "a11y-1",
                  target: { issueId: "color-contrast", path: "/" },
                  confidence: "high",
                  evidence: [{ sourceRelPath: "accessibility-summary.json", pointer: "/results/0" }],
                  metrics: { criticalViolationCount: 1, seriousViolationCount: 2 },
                },
              ],
            },
          ],
        },
      ],
    });

    const result = evaluateBenchmarkFamilyGates({
      families,
      config: {
        accessibilityExtended: {
          maxCriticalViolations: 2,
          maxSeriousViolations: 5,
        },
      },
      runnerLimits: {
        maxHeaderFailures: 0,
        maxBrokenLinks: 0,
        maxHealthErrors: 0,
        maxAccessibilityCriticalViolations: 0,
        maxAccessibilitySeriousViolations: 0,
      },
    });
    expect(result.violations).toHaveLength(0);
    expect(result.families[0]?.passed).toBe(true);
  });
});
