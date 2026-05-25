import { describe, expect, it } from "vitest";
import {
  avgPerformanceSummaryLabel,
  buildAgentIndexPerformanceScoreSemantics,
  buildStatsPanelContentLines,
  buildTrustNoteLines,
  performanceColumnLabel,
  shellRunStrategyTrustLine,
  throughputStatsPerformanceNote,
} from "../src/performance-score-labels.js";
import { isAgentIndexV3 } from "../src/engine-contracts/artifacts/v3/index.js";

describe("performance score labels", () => {
  it("uses P(ref) in throughput mode stats output", () => {
    const lines = buildStatsPanelContentLines({
      mode: "throughput",
      avgP: 72,
      avgA: 97,
      avgBP: 100,
      avgSEO: 100,
      green: 16,
      yellow: 69,
      red: 5,
      count: 90,
    });
    expect(lines[0]).toBe("Summary: Avg P(ref):72 A:97 BP:100 SEO:100");
    expect(lines[2]).toBe(throughputStatsPerformanceNote());
  });

  it("keeps plain P in fidelity mode", () => {
    expect(performanceColumnLabel("fidelity")).toBe("P");
    expect(avgPerformanceSummaryLabel("fidelity")).toBe("Avg P");
    const lines = buildStatsPanelContentLines({
      mode: "fidelity",
      avgP: 88,
      avgA: 97,
      avgBP: 100,
      avgSEO: 100,
      green: 10,
      yellow: 5,
      red: 0,
      count: 15,
    });
    expect(lines).toHaveLength(2);
    expect(lines[0]).toContain("Avg P:88");
  });

  it("explains DevTools divergence in throughput trust note", () => {
    const lines = buildTrustNoteLines("throughput");
    expect(lines.join(" ")).toMatch(/DevTools/);
    expect(lines.join(" ")).toMatch(/P\(ref\)/);
  });

  it("updates shell run strategy trust line", () => {
    expect(shellRunStrategyTrustLine("throughput")).toMatch(/P\(ref\)/);
    expect(shellRunStrategyTrustLine("fidelity")).toMatch(/fidelity/);
  });

  it("builds agent-index performance score semantics for throughput", () => {
    const semantics = buildAgentIndexPerformanceScoreSemantics("throughput");
    expect(semantics.performanceColumnLabel).toBe("P(ref)");
    expect(semantics.scoreKind).toBe("lab-reference");
    expect(semantics.validationCommand).toBe("signaler run --mode fidelity");
    expect(isAgentIndexV3({
      generatedAt: new Date().toISOString(),
      contractVersion: "v3",
      mode: "throughput",
      profile: "throughput-balanced",
      comparabilityHash: "abc123",
      tokenBudget: 8000,
      entrypoints: { run: "run.json", results: "results.json", suggestions: "suggestions.json" },
      performanceScoreSemantics: semantics,
      topSuggestions: [{
        id: "s-1",
        title: "Reduce JS",
        priorityScore: 1000,
        confidence: "high",
        pointer: "suggestions[0]",
      }],
    })).toBe(true);
  });
});
