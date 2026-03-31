import { describe, expect, it } from "vitest";
import { isAgentIndexV3, isSuggestionsV3 } from "../src/contracts/v3/validators.js";

describe("v3 suggestions validator (phase5)", () => {
  it("accepts suggestions with non-empty evidence pointers", () => {
    const candidate = {
      generatedAt: new Date().toISOString(),
      mode: "throughput",
      comparabilityHash: "abc123",
      suggestions: [
        {
          id: "s-1",
          title: "Reduce unused JavaScript",
          category: "performance",
          priorityScore: 1000,
          confidence: "high",
          estimatedImpact: { timeMs: 1200, bytes: 50000, affectedCombos: 3 },
          evidence: [{ sourceRelPath: "issues.json", pointer: "/topIssues/0" }],
          action: { summary: "Split route bundles.", steps: ["Inspect", "Fix", "Re-run"], effort: "medium" },
          modeApplicability: ["throughput", "fidelity"],
        },
      ],
    };
    expect(isSuggestionsV3(candidate)).toBe(true);
  });

  it("accepts optional external signals metadata on suggestions", () => {
    const candidate = {
      generatedAt: new Date().toISOString(),
      mode: "throughput",
      comparabilityHash: "abc123",
      externalSignals: {
        enabled: true,
        inputFiles: ["/tmp/signals.json"],
        accepted: 2,
        rejected: 1,
        digest: "deadbeef",
        policy: "v1-conservative-high-30d-route-issue",
      },
      suggestions: [
        {
          id: "s-1",
          title: "Reduce unused JavaScript",
          category: "performance",
          priorityScore: 1000,
          confidence: "high",
          estimatedImpact: { timeMs: 1200, bytes: 50000, affectedCombos: 3 },
          evidence: [{ sourceRelPath: "issues.json", pointer: "/topIssues/0" }],
          action: { summary: "Split route bundles.", steps: ["Inspect", "Fix", "Re-run"], effort: "medium" },
          modeApplicability: ["throughput", "fidelity"],
        },
      ],
    };
    expect(isSuggestionsV3(candidate)).toBe(true);
  });

  it("accepts disabled external signals metadata defaults on suggestions", () => {
    const candidate = {
      generatedAt: new Date().toISOString(),
      mode: "throughput",
      comparabilityHash: "abc123",
      externalSignals: {
        enabled: false,
        inputFiles: [],
        accepted: 0,
        rejected: 0,
        digest: null,
        policy: "v1-conservative-high-30d-route-issue",
      },
      suggestions: [
        {
          id: "s-1",
          title: "Reduce unused JavaScript",
          category: "performance",
          priorityScore: 1000,
          confidence: "high",
          estimatedImpact: { timeMs: 1200, bytes: 50000, affectedCombos: 3 },
          evidence: [{ sourceRelPath: "issues.json", pointer: "/topIssues/0" }],
          action: { summary: "Split route bundles.", steps: ["Inspect", "Fix", "Re-run"], effort: "medium" },
          modeApplicability: ["throughput", "fidelity"],
        },
      ],
    };
    expect(isSuggestionsV3(candidate)).toBe(true);
  });

  it("accepts optional multi-benchmark metadata on suggestions", () => {
    const candidate = {
      generatedAt: new Date().toISOString(),
      mode: "throughput",
      comparabilityHash: "abc123",
      multiBenchmark: {
        enabled: true,
        inputFiles: ["/tmp/bench-a.json", "/tmp/bench-b.json"],
        sources: ["accessibility-extended", "seo-technical", "reliability-slo", "cross-browser-parity"],
        accepted: 2,
        rejected: 1,
        digest: "deadbeef",
        policy: "v1-conservative-high-30d-route-issue",
        rankingVersion: "j3-composite-ranking",
      },
      suggestions: [
        {
          id: "s-1",
          title: "Reduce unused JavaScript",
          category: "performance",
          priorityScore: 1000,
          confidence: "high",
          estimatedImpact: { timeMs: 1200, bytes: 50000, affectedCombos: 3 },
          evidence: [{ sourceRelPath: "issues.json", pointer: "/topIssues/0" }],
          action: { summary: "Split route bundles.", steps: ["Inspect", "Fix", "Re-run"], effort: "medium" },
          modeApplicability: ["throughput", "fidelity"],
        },
      ],
    };
    expect(isSuggestionsV3(candidate)).toBe(true);
  });

  it("rejects suggestions when evidence pointers are missing", () => {
    const candidate = {
      generatedAt: new Date().toISOString(),
      mode: "throughput",
      comparabilityHash: "abc123",
      suggestions: [
        {
          id: "s-1",
          title: "Bad suggestion",
          evidence: [],
        },
      ],
    };
    expect(isSuggestionsV3(candidate)).toBe(false);
  });
});

describe("v3 agent-index validator (phase5)", () => {
  it("accepts additive compatibility mappings", () => {
    const candidate = {
      generatedAt: new Date().toISOString(),
      contractVersion: "v3",
      mode: "throughput",
      profile: "throughput-balanced",
      comparabilityHash: "abc123",
      tokenBudget: 8000,
      entrypoints: {
        run: "run.json",
        results: "results.json",
        suggestions: "suggestions.json",
      },
      compatibility: {
        legacyToCanonical: [
          { legacyArtifact: "summary-lite.json", canonicalArtifact: "results.json" },
          { legacyArtifact: "ai-ledger.json", canonicalArtifact: "agent-index.json" },
        ],
      },
      machineOutput: {
        artifactProfile: "lean",
        estimatedTokens: 420,
        droppedByTokenBudget: 0,
        topSuggestionsCap: 12,
      },
      topSuggestions: [
        {
          id: "s-1",
          title: "Reduce JS",
          priorityScore: 1000,
          confidence: "high",
          pointer: "suggestions[?(@.id==\"s-1\")]",
        },
      ],
    };
    expect(isAgentIndexV3(candidate)).toBe(true);
  });

  it("rejects invalid compatibility mappings", () => {
    const candidate = {
      generatedAt: new Date().toISOString(),
      contractVersion: "v3",
      mode: "throughput",
      profile: "throughput-balanced",
      comparabilityHash: "abc123",
      tokenBudget: 8000,
      entrypoints: {
        run: "run.json",
        results: "results.json",
        suggestions: "suggestions.json",
      },
      compatibility: {
        legacyToCanonical: [
          { legacyArtifact: "summary-lite.json", canonicalArtifact: "not-real.json" },
        ],
      },
      topSuggestions: [],
    };
    expect(isAgentIndexV3(candidate)).toBe(false);
  });
});
