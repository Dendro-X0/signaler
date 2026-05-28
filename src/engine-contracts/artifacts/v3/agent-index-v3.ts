import type { SuggestionConfidenceV3 } from "./suggestions-v3.js";
import type { RunnerModeV3, RunnerProfileV3 } from "./run-v3.js";

export interface AgentIndexSuggestionRefV3 {
  readonly id: string;
  readonly title: string;
  readonly priorityScore: number;
  readonly confidence: SuggestionConfidenceV3;
  readonly pointer: string;
}

export interface AgentIndexPerformanceScoreSemanticsV3 {
  readonly performanceColumnLabel: "P(ref)" | "P";
  readonly scoreKind: "lab-reference" | "devtools-parity";
  readonly disclaimer: string;
  readonly trustNotes: readonly string[];
  readonly validationCommand?: string;
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
    readonly performanceTriage?: "performance-triage.json";
    readonly analyze?: "analyze.json";
    readonly headers?: "headers.json";
    readonly links?: "links.json";
    readonly bundle?: "bundle-audit.json";
    readonly qualityPack?: "quality-pack.json";
  };
  readonly performanceReporting?: "issue-count" | "score";
  readonly performanceScoreSemantics?: AgentIndexPerformanceScoreSemanticsV3;
  readonly agentProtocol?: {
    readonly mandatoryReads: readonly string[];
    readonly optionalReads: readonly string[];
    readonly queryCommand: string;
    readonly explainCommand: string;
    readonly jobExitCodes?: {
      readonly "0": string;
      readonly "1": string;
      readonly "2": string;
    };
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
  readonly partialSuccess?: {
    readonly reason: "analyze-failed";
    readonly message: string;
    readonly fallbackArtifacts: readonly string[];
  };
  /** Present after `--quality-profile` jobs (v5). */
  readonly qualityPack?: {
    readonly profile: string;
    readonly passed: boolean;
    readonly relativePath: "quality-pack.json";
    readonly summary: {
      readonly headerFailures: number;
      readonly brokenLinks: number;
      readonly linksDiscovered?: number;
      readonly linksStatus?: "pass" | "inconclusive" | "fail";
      readonly bundleFileCount: number;
    };
    readonly guidance?: readonly string[];
  };
}
