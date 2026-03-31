import type { ApexDevice } from "../../core/types.js";
import type { ExternalSignalsMetadataV1 } from "../external-signals-v1.js";
import type { MultiBenchmarkMetadataV1 } from "../multi-benchmark-v1.js";

export type AnalyzeArtifactProfileV6 = "lean" | "standard" | "diagnostics";

export type AnalyzeConfidenceV6 = "high" | "medium" | "low";

export type AnalyzeCategoryV6 = "performance" | "accessibility" | "best-practices" | "seo" | "reliability";

export interface AnalyzeEvidenceV6 {
  readonly sourceRelPath: string;
  readonly pointer: string;
  readonly artifactRelPath?: string;
}

export interface AnalyzeActionV6 {
  readonly id: string;
  readonly sourceSuggestionId?: string;
  readonly title: string;
  readonly category: AnalyzeCategoryV6;
  readonly priorityScore: number;
  readonly confidence: AnalyzeConfidenceV6;
  readonly estimatedImpact: {
    readonly timeMs?: number;
    readonly bytes?: number;
    readonly affectedCombos: number;
  };
  readonly affectedCombos: readonly {
    readonly label: string;
    readonly path: string;
    readonly device: ApexDevice;
  }[];
  readonly evidence: readonly AnalyzeEvidenceV6[];
  readonly action: {
    readonly summary: string;
    readonly steps: readonly string[];
    readonly effort: "low" | "medium" | "high";
  };
  readonly verifyPlan: {
    readonly recommendedMode: "fidelity" | "throughput";
    readonly targetRoutes: readonly string[];
    readonly expectedDirection: {
      readonly score?: "up";
      readonly lcpMs?: "down";
      readonly tbtMs?: "down";
      readonly cls?: "down";
      readonly bytes?: "down";
    };
  };
}

export interface AnalyzeReportV6 {
  readonly schemaVersion: 1;
  readonly generatedAt: string;
  readonly source: {
    readonly dir: string;
    readonly runComparabilityHash: string;
    readonly runMode: "fidelity" | "throughput";
    readonly runProfile: string;
  };
  readonly artifactProfile: AnalyzeArtifactProfileV6;
  readonly tokenBudget: number;
  readonly rankingPolicy: {
    readonly version: "v6.1" | "v6.2" | "v6.3";
    readonly formula:
    | "priority = round(basePriority * confidenceWeight * coverageWeight)"
    | "priority = round(basePriority * confidenceWeight * coverageWeight * (1 + externalBoostWeight))"
    | "priority = round(basePriority * confidenceWeight * coverageWeight * (1 + externalBoostWeight + benchmarkBoostWeight))";
    readonly confidenceWeights: {
      readonly high: 1.0;
      readonly medium: 0.7;
      readonly low: 0.4;
    };
  };
  readonly actions: readonly AnalyzeActionV6[];
  readonly externalSignals?: ExternalSignalsMetadataV1;
  readonly multiBenchmark?: MultiBenchmarkMetadataV1;
  readonly summary: {
    readonly totalCandidates: number;
    readonly emittedActions: number;
    readonly droppedZeroImpact: number;
    readonly droppedLowConfidence: number;
    readonly droppedMissingEvidence: number;
    readonly droppedDuplicate: number;
    readonly droppedByProfileCap: number;
    readonly droppedByTopActions: number;
    readonly droppedByTokenBudget: number;
    readonly estimatedTokens: number;
    readonly warnings: readonly string[];
  };
}
