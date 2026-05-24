import type { RunnerModeV3 } from "./run-v3.js";

export type PerformanceIssueSeverity = "red" | "yellow" | "green";

export type PerformanceIssueKind = "audit" | "opportunity";

export interface PerformanceTriageIssueV3 {
  readonly id: string;
  readonly title: string;
  readonly severity: "red" | "yellow";
  readonly kind: PerformanceIssueKind;
  readonly affectedCombos: number;
  readonly totalEstimatedSavingsMs?: number;
  readonly totalEstimatedSavingsBytes?: number;
  readonly pointer: string;
}

export interface PerformanceTriageV3 {
  readonly generatedAt: string;
  readonly contractVersion: "v3";
  readonly reportingModel: "issue-count";
  readonly comparabilityHash: string;
  readonly mode: RunnerModeV3;
  readonly options: {
    readonly includeYellow: boolean;
  };
  readonly disclaimer: string;
  readonly categoryScores: {
    readonly accessibility?: number;
    readonly bestPractices?: number;
    readonly seo?: number;
    readonly note: string;
  };
  readonly totals: {
    readonly red: number;
    readonly yellow: number;
    readonly green: number;
    readonly actionable: number;
  };
  readonly uniqueIssues: readonly PerformanceTriageIssueV3[];
}
