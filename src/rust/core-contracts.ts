import type { ApexCategory, ApexDevice, ApexPageScope, ApexThrottlingMethod, ApexThroughputBackoffPolicy, PageDeviceSummary } from "../core/types.js";
import type { RunnerModeV3, RunnerProfileV3 } from "../contracts/v3/run-v3.js";
import type { SuggestionV3 } from "../contracts/v3/suggestions-v3.js";

export type RustCoreRunnerStability = {
  readonly backoffPolicy: ApexThroughputBackoffPolicy;
  readonly initialParallel: number;
  readonly finalParallel: number;
  readonly totalAttempts: number;
  readonly totalFailures: number;
  readonly totalRetries: number;
  readonly reductions: number;
  readonly cooldownPauses: number;
  readonly failureRate: number;
  readonly retryRate: number;
  readonly maxConsecutiveRetries: number;
  readonly cooldownMsTotal: number;
  readonly recoveryIncreases: number;
  readonly status: "stable" | "degraded" | "unstable";
};

export type RustCoreStepTimings = {
  readonly warmUpMs: number;
  readonly queueBuildMs: number;
  readonly runLoopMs: number;
  readonly reductionMs: number;
  readonly totalMs: number;
};

export type RustCoreExecution = {
  readonly elapsedMs: number;
  readonly attemptedTasks: number;
  readonly completedTasks: number;
  readonly stepTimings: RustCoreStepTimings;
};

export type RustCoreWorker = {
  readonly command: string;
  readonly args: readonly string[];
};

export type RustCoreTask = {
  readonly url: string;
  readonly path: string;
  readonly label: string;
  readonly device: ApexDevice;
  readonly pageScope?: ApexPageScope;
  readonly logLevel: "silent" | "error" | "info" | "verbose";
  readonly throttlingMethod: ApexThrottlingMethod;
  readonly cpuSlowdownMultiplier: number;
  readonly timeoutMs: number;
  readonly onlyCategories?: readonly ApexCategory[];
  readonly captureLevel?: "diagnostics" | "lhr";
  readonly outputDir: string;
  readonly runs: number;
};

export type RunCoreInput = {
  readonly schemaVersion: 1;
  readonly mode: RunnerModeV3;
  readonly baseUrl: string;
  readonly parallel: number;
  readonly runsPerCombo: number;
  readonly throttlingMethod: ApexThrottlingMethod;
  readonly cpuSlowdownMultiplier: number;
  readonly sessionIsolation: "shared" | "per-audit";
  readonly throughputBackoff: ApexThroughputBackoffPolicy;
  readonly warmUp: {
    readonly enabled: boolean;
    readonly sampleSize?: number;
    readonly concurrency?: number;
  };
  readonly auditTimeoutMs: number;
  readonly captureLevel: "none" | "diagnostics" | "lhr";
  readonly outputDir: string;
  readonly tasks: readonly RustCoreTask[];
  readonly worker: RustCoreWorker;
};

export type RunCoreOutput = {
  readonly schemaVersion: 1;
  readonly status: "ok" | "warn" | "error";
  readonly results: readonly PageDeviceSummary[];
  readonly runnerStability: RustCoreRunnerStability;
  readonly execution: RustCoreExecution;
  readonly fallbackSafeDefaultsUsed: boolean;
  readonly errorMessage?: string;
};

export type ReduceSignalsInput = {
  readonly schemaVersion: 1;
  readonly summaryPath: string;
  readonly protocol: {
    readonly mode: RunnerModeV3;
    readonly profile: RunnerProfileV3;
    readonly comparabilityHash: string;
  };
  readonly policy: {
    readonly zeroImpactFilter: boolean;
    readonly minConfidence: "high" | "medium" | "low";
    readonly maxSuggestions: number;
  };
};

export type ReduceSignalsTopIssue = {
  readonly id: string;
  readonly title: string;
  readonly count: number;
  readonly totalMs: number;
};

export type ReduceSignalsOutput = {
  readonly schemaVersion: 1;
  readonly status: "ok" | "warn" | "error";
  readonly topIssues: readonly ReduceSignalsTopIssue[];
  readonly suggestions: readonly SuggestionV3[];
  readonly stats: {
    readonly elapsedMs: number;
    readonly issueCount: number;
    readonly suggestionCount: number;
  };
  readonly errorMessage?: string;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function isFiniteNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.length > 0;
}

function isStability(value: unknown): value is RustCoreRunnerStability {
  if (!isRecord(value)) return false;
  if (value.backoffPolicy !== "auto" && value.backoffPolicy !== "aggressive" && value.backoffPolicy !== "off") return false;
  if (!isFiniteNumber(value.initialParallel)) return false;
  if (!isFiniteNumber(value.finalParallel)) return false;
  if (!isFiniteNumber(value.totalAttempts)) return false;
  if (!isFiniteNumber(value.totalFailures)) return false;
  if (!isFiniteNumber(value.totalRetries)) return false;
  if (!isFiniteNumber(value.reductions)) return false;
  if (!isFiniteNumber(value.cooldownPauses)) return false;
  if (!isFiniteNumber(value.failureRate)) return false;
  if (!isFiniteNumber(value.retryRate)) return false;
  if (!isFiniteNumber(value.maxConsecutiveRetries)) return false;
  if (!isFiniteNumber(value.cooldownMsTotal)) return false;
  if (!isFiniteNumber(value.recoveryIncreases)) return false;
  if (value.status !== "stable" && value.status !== "degraded" && value.status !== "unstable") return false;
  return true;
}

function isStepTimings(value: unknown): value is RustCoreStepTimings {
  if (!isRecord(value)) return false;
  if (!isFiniteNumber(value.warmUpMs)) return false;
  if (!isFiniteNumber(value.queueBuildMs)) return false;
  if (!isFiniteNumber(value.runLoopMs)) return false;
  if (!isFiniteNumber(value.reductionMs)) return false;
  if (!isFiniteNumber(value.totalMs)) return false;
  return true;
}

function isExecution(value: unknown): value is RustCoreExecution {
  if (!isRecord(value)) return false;
  if (!isFiniteNumber(value.elapsedMs)) return false;
  if (!isFiniteNumber(value.attemptedTasks)) return false;
  if (!isFiniteNumber(value.completedTasks)) return false;
  if (!isStepTimings(value.stepTimings)) return false;
  return true;
}

function isPageDeviceSummaryLike(value: unknown): value is PageDeviceSummary {
  if (!isRecord(value)) return false;
  if (!isNonEmptyString(value.url)) return false;
  if (!isNonEmptyString(value.path)) return false;
  if (!isNonEmptyString(value.label)) return false;
  if (value.device !== "mobile" && value.device !== "desktop") return false;
  if (!isRecord(value.scores) || !isRecord(value.metrics)) return false;
  if (!Array.isArray(value.opportunities)) return false;
  if (!Array.isArray(value.failedAudits)) return false;
  return true;
}

export function validateRunCoreOutput(raw: unknown): RunCoreOutput | undefined {
  if (!isRecord(raw)) return undefined;
  if (raw.schemaVersion !== 1) return undefined;
  if (raw.status !== "ok" && raw.status !== "warn" && raw.status !== "error") return undefined;
  if (!Array.isArray(raw.results)) return undefined;
  if (!raw.results.every((entry) => isPageDeviceSummaryLike(entry))) return undefined;
  if (!isStability(raw.runnerStability)) return undefined;
  if (!isExecution(raw.execution)) return undefined;
  if (typeof raw.fallbackSafeDefaultsUsed !== "boolean") return undefined;
  if (raw.errorMessage !== undefined && raw.errorMessage !== null && typeof raw.errorMessage !== "string") return undefined;
  return raw as RunCoreOutput;
}

function isTopIssue(value: unknown): value is ReduceSignalsTopIssue {
  if (!isRecord(value)) return false;
  if (!isNonEmptyString(value.id) || !isNonEmptyString(value.title)) return false;
  if (!isFiniteNumber(value.count) || !isFiniteNumber(value.totalMs)) return false;
  return true;
}

function isSuggestion(value: unknown): value is SuggestionV3 {
  if (!isRecord(value)) return false;
  if (!isNonEmptyString(value.id) || !isNonEmptyString(value.title)) return false;
  if (value.category !== "performance" && value.category !== "accessibility" && value.category !== "best-practices" && value.category !== "seo" && value.category !== "reliability") {
    return false;
  }
  if (!isFiniteNumber(value.priorityScore)) return false;
  if (value.confidence !== "high" && value.confidence !== "medium" && value.confidence !== "low") return false;
  if (!isRecord(value.estimatedImpact) || !isFiniteNumber(value.estimatedImpact.affectedCombos)) return false;
  if (!Array.isArray(value.evidence) || value.evidence.length === 0) return false;
  if (!Array.isArray(value.modeApplicability)) return false;
  return true;
}

export function validateReduceSignalsOutput(raw: unknown): ReduceSignalsOutput | undefined {
  if (!isRecord(raw)) return undefined;
  if (raw.schemaVersion !== 1) return undefined;
  if (raw.status !== "ok" && raw.status !== "warn" && raw.status !== "error") return undefined;
  if (!Array.isArray(raw.topIssues) || !raw.topIssues.every((item) => isTopIssue(item))) return undefined;
  if (!Array.isArray(raw.suggestions) || !raw.suggestions.every((item) => isSuggestion(item))) return undefined;
  if (!isRecord(raw.stats)) return undefined;
  if (!isFiniteNumber(raw.stats.elapsedMs) || !isFiniteNumber(raw.stats.issueCount) || !isFiniteNumber(raw.stats.suggestionCount)) return undefined;
  if (raw.errorMessage !== undefined && raw.errorMessage !== null && typeof raw.errorMessage !== "string") return undefined;
  return raw as ReduceSignalsOutput;
}
