import type { ApexDevice, ApexPageScope, CategoryScores, FailedAuditSummary, MetricValues } from "../../core/types.js";
import type { RunProtocolV3 } from "./run-v3.js";

export interface ResultsV3Line {
  readonly label: string;
  readonly path: string;
  readonly url: string;
  readonly device: ApexDevice;
  readonly pageScope?: ApexPageScope;
  readonly scores: CategoryScores;
  readonly metrics: MetricValues;
  readonly runtimeErrorCode?: string;
  readonly runtimeErrorMessage?: string;
  readonly opportunities: readonly {
    readonly id: string;
    readonly title: string;
    readonly estimatedSavingsMs?: number;
    readonly estimatedSavingsBytes?: number;
  }[];
  readonly failedAudits: readonly Pick<FailedAuditSummary, "id" | "title" | "description" | "score" | "scoreDisplayMode">[];
}

export interface ResultsV3 {
  readonly generatedAt: string;
  readonly outputDir: string;
  readonly protocol: RunProtocolV3;
  readonly meta: {
    readonly configPath: string;
    readonly incremental: boolean;
    readonly resolvedParallel: number;
    readonly totalSteps: number;
    readonly comboCount: number;
    readonly executedCombos: number;
    readonly cachedCombos: number;
    readonly runsPerCombo: number;
    readonly executedSteps: number;
    readonly cachedSteps: number;
    readonly warmUp: boolean;
    readonly throttlingMethod: "simulate" | "devtools";
    readonly cpuSlowdownMultiplier: number;
    readonly startedAt: string;
    readonly completedAt: string;
    readonly elapsedMs: number;
    readonly averageStepMs: number;
    readonly buildId?: string;
  };
  readonly results: readonly ResultsV3Line[];
}
