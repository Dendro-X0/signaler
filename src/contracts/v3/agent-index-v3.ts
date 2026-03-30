import type { SuggestionConfidenceV3 } from "./suggestions-v3.js";
import type { RunnerModeV3, RunnerProfileV3 } from "./run-v3.js";

export interface AgentIndexSuggestionRefV3 {
  readonly id: string;
  readonly title: string;
  readonly priorityScore: number;
  readonly confidence: SuggestionConfidenceV3;
  readonly pointer: string;
}

export interface AgentIndexV3 {
  readonly generatedAt: string;
  readonly contractVersion: "v3";
  readonly mode: RunnerModeV3;
  readonly profile: RunnerProfileV3;
  readonly comparabilityHash: string;
  readonly tokenBudget: number;
  readonly entrypoints: {
    readonly run: "run.json";
    readonly results: "results.json";
    readonly suggestions: "suggestions.json";
  };
  readonly compatibility?: {
    readonly legacyToCanonical: readonly {
      readonly legacyArtifact: string;
      readonly canonicalArtifact: "run.json" | "results.json" | "suggestions.json" | "agent-index.json";
      readonly notes?: string;
    }[];
  };
  readonly machineOutput?: {
    readonly artifactProfile: "lean" | "standard" | "diagnostics";
    readonly estimatedTokens: number;
    readonly droppedByTokenBudget: number;
    readonly topSuggestionsCap: number;
  };
  readonly topSuggestions: readonly AgentIndexSuggestionRefV3[];
}
