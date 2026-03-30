import { describe, expect, it } from "vitest";
import {
  buildTopSuggestionRefs,
  estimateTokens,
  getMachineProfileCaps,
} from "../src/machine-output-profile.js";

describe("machine-output profile defaults", () => {
  it("returns documented defaults for lean/standard/diagnostics", () => {
    expect(getMachineProfileCaps("lean")).toEqual({ topSuggestionsCap: 12, defaultTokenBudget: 8000 });
    expect(getMachineProfileCaps("standard")).toEqual({ topSuggestionsCap: 25, defaultTokenBudget: 16000 });
    expect(getMachineProfileCaps("diagnostics")).toEqual({ topSuggestionsCap: 50, defaultTokenBudget: 32000 });
  });

  it("builds deterministic top suggestion refs", () => {
    const refs = buildTopSuggestionRefs(
      [
        {
          id: "s-1",
          title: "A",
          category: "performance",
          priorityScore: 100,
          confidence: "high",
          estimatedImpact: { affectedCombos: 1 },
          evidence: [{ sourceRelPath: "issues.json", pointer: "/topIssues/0" }],
          action: { summary: "x", steps: ["a"], effort: "low" },
          modeApplicability: ["throughput", "fidelity"],
        },
      ],
      12,
    );
    expect(refs).toEqual([
      {
        id: "s-1",
        title: "A",
        priorityScore: 100,
        confidence: "high",
        pointer: "suggestions[?(@.id==\"s-1\")]",
      },
    ]);
  });

  it("estimates positive token counts", () => {
    expect(estimateTokens({ a: "b" })).toBeGreaterThan(0);
  });
});
