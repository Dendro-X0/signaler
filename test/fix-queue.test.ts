import { describe, expect, it } from "vitest";
import { buildFixQueueV1, isFixQueueV1 } from "../src/fix-queue.js";
import type { AnalyzeActionV6 } from "../src/engine-contracts/artifacts/v6/analyze-v6.js";
import type { PerformanceTriageV3 } from "../src/engine-contracts/artifacts/v3/performance-triage-v3.js";

describe("fix-queue", () => {
  it("builds surgical targets with path, url, savings, and triage pointers", () => {
    const actions: AnalyzeActionV6[] = [
      {
        id: "action-triage-unused-javascript",
        title: "Reduce unused JavaScript",
        category: "performance",
        confidence: "high",
        priorityScore: 95,
        sourceSuggestionId: "triage-unused-javascript",
        affectedCombos: [{ label: "home", path: "/", device: "mobile" }],
        evidence: [],
        action: { steps: ["Audit bundle imports for /"] },
        verifyPlan: { command: "signaler verify --contract v6" },
      },
    ];
    const triage: PerformanceTriageV3 = {
      schemaVersion: 3,
      generatedAt: new Date().toISOString(),
      mode: "throughput",
      comparabilityHash: "abc",
      totals: { combos: 1, actionable: 1, red: 1, yellow: 0 },
      uniqueIssues: [
        {
          id: "unused-javascript",
          title: "Reduce unused JavaScript",
          kind: "opportunity",
          severity: "red",
          pointer: "performance-triage.json#/uniqueIssues/0",
        },
      ],
      combos: [
        {
          label: "home",
          path: "/",
          device: "mobile",
          url: "http://127.0.0.1:3000/",
          auditStatus: "scored",
          issues: [
            {
              id: "unused-javascript",
              title: "Reduce unused JavaScript",
              severity: "red",
              estimatedSavingsMs: 420,
              estimatedSavingsBytes: 120_000,
            },
          ],
          pointer: "performance-triage.json#/combos/0",
        },
      ],
    };
    const queue = buildFixQueueV1({
      actions,
      comparabilityHash: "abc",
      performanceTriage: triage,
      results: [
        {
          label: "home",
          path: "/",
          device: "mobile",
          url: "http://127.0.0.1:3000/",
        },
      ],
    });
    expect(isFixQueueV1(queue)).toBe(true);
    expect(queue.items).toHaveLength(1);
    const target = queue.items[0]?.targets[0];
    expect(target?.path).toBe("/");
    expect(target?.url).toBe("http://127.0.0.1:3000/");
    expect(target?.estimatedSavingsMs).toBe(420);
    expect(target?.pointer).toBe("performance-triage.json#/combos/0");
    expect(queue.fixLoop.auditIncremental).toContain("--incremental-skip");
  });
});
