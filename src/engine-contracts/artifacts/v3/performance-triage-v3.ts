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

export interface PerformanceTriageComboIssueV3 {
  readonly id: string;
  readonly title: string;
  readonly severity: "red" | "yellow";
  readonly kind: PerformanceIssueKind;
  readonly estimatedSavingsMs?: number;
  readonly estimatedSavingsBytes?: number;
}

export interface PerformanceTriageComboV3 {
  readonly label: string;
  readonly path: string;
  readonly device: string;
  readonly url?: string;
  readonly auditStatus: "scored" | "skipped-auth" | "skipped-unreachable" | "runner-error" | "partial";
  readonly runtimeErrorMessage?: string;
  readonly categoryScores?: {
    readonly performance?: number;
    readonly accessibility?: number;
    readonly bestPractices?: number;
    readonly seo?: number;
  };
  readonly counts: {
    readonly red: number;
    readonly yellow: number;
    readonly actionable: number;
  };
  readonly issues: readonly PerformanceTriageComboIssueV3[];
  readonly pointer: string;
}

export interface PerformanceTriageCoverageSummaryV3 {
  readonly combos: number;
  readonly scored: number;
  readonly skipped: number;
  readonly skippedAuth: number;
  readonly skippedUnreachable: number;
  readonly runnerErrors: number;
  readonly partial: number;
  readonly expectedToScore: number;
  readonly scoreRate: number;
  readonly artifact: "coverage.json";
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
  readonly coverage: PerformanceTriageCoverageSummaryV3;
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
  readonly combos: readonly PerformanceTriageComboV3[];
}
