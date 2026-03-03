import type { RunnerModeV3 } from "./run-v3.js";

export type SuggestionCategoryV3 = "performance" | "accessibility" | "best-practices" | "seo" | "reliability";

export type SuggestionConfidenceV3 = "high" | "medium" | "low";

export interface SuggestionV3 {
  readonly id: string;
  readonly title: string;
  readonly category: SuggestionCategoryV3;
  readonly priorityScore: number;
  readonly confidence: SuggestionConfidenceV3;
  readonly estimatedImpact: {
    readonly timeMs?: number;
    readonly bytes?: number;
    readonly affectedCombos: number;
  };
  readonly evidence: readonly {
    readonly sourceRelPath: string;
    readonly pointer: string;
    readonly artifactRelPath?: string;
  }[];
  readonly action: {
    readonly summary: string;
    readonly steps: readonly string[];
    readonly effort: "low" | "medium" | "high";
  };
  readonly modeApplicability: readonly RunnerModeV3[];
}

export interface SuggestionsV3 {
  readonly generatedAt: string;
  readonly mode: RunnerModeV3;
  readonly comparabilityHash: string;
  readonly suggestions: readonly SuggestionV3[];
}
