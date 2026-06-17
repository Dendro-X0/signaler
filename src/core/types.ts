/**
 * Core Types - Shared type definitions used across modules
 * 
 * This module contains all the core type definitions that are used
 * throughout the Signaler application.
 */

/**
 * Device profiles supported by Signaler.
 */
export type ApexDevice = "mobile" | "desktop";

/**
 * Scope classification for a page in the audit plan.
 */
export type ApexPageScope = "public" | "requires-auth";

/**
 * Throttling method for Lighthouse audits.
 * - "simulate": Fast, uses simulation (default). May produce lower scores than DevTools.
 * - "devtools": More accurate, matches Chrome DevTools results but slower.
 */
export type ApexThrottlingMethod = "simulate" | "devtools";
export type ApexThroughputBackoffPolicy = "auto" | "aggressive" | "off";

/**
 * Page configuration entry for the audit plan.
 */
export interface ApexPageConfig {
  readonly path: string;
  readonly label: string;
  readonly devices: readonly ApexDevice[];
  readonly scope?: ApexPageScope;
  /** Named `auth.profiles` entry for this route (optional). */
  readonly authProfile?: string;
}

/**
 * Budget thresholds for Lighthouse category scores.
 */
export interface CategoryBudgetThresholds {
  readonly performance?: number;
  readonly accessibility?: number;
  readonly bestPractices?: number;
  readonly seo?: number;
}

/**
 * Budget thresholds for Lighthouse metric values.
 */
export interface MetricBudgetThresholds {
  readonly lcpMs?: number;
  readonly fcpMs?: number;
  readonly tbtMs?: number;
  readonly cls?: number;
  readonly inpMs?: number;
}

/**
 * Combined budgets for categories and metrics.
 */
export interface ApexBudgets {
  readonly categories?: CategoryBudgetThresholds;
  readonly metrics?: MetricBudgetThresholds;
}

export interface ApexAuthLoginConfig {
  readonly loginUrl?: string;
  readonly email?: string;
  readonly password?: string;
  readonly emailEnv?: string;
  readonly passwordEnv?: string;
  readonly emailSelector?: string;
  readonly passwordSelector?: string;
  readonly submitSelector?: string;
  readonly successPathPrefix?: string;
}

export interface ApexAuthProfileConfig {
  readonly cookies?: string;
  readonly cookieFile?: string;
  readonly warmupUrl?: string;
  readonly headers?: Readonly<Record<string, string>>;
}

export interface ApexAuthConfig {
  /** Raw Cookie header value, e.g. `session=abc; role=admin`. */
  readonly cookies?: string;
  /** Path relative to config file; lines joined as Cookie header (# comments allowed). */
  readonly cookieFile?: string;
  /** GET this path before audit to obtain Set-Cookie (e.g. `/api/demo-auth`). */
  readonly warmupUrl?: string;
  /** Extra request headers for preflight + Lighthouse (e.g. lab bypass secret). */
  readonly headers?: Readonly<Record<string, string>>;
  /** When true (or with `--lab-auth`), only allows localhost / 127.0.0.1 and validates probe path. */
  readonly lab?: boolean;
  /** Path to GET after warmup to confirm session (defaults to first requires-auth route). */
  readonly probePath?: string;
  /** Path prefixes checked for login HTML heuristics during preflight. */
  readonly protectedPathPrefixes?: readonly string[];
  /** Named auth sessions for pages with `authProfile`. */
  readonly profiles?: Readonly<Record<string, ApexAuthProfileConfig>>;
  /** Playwright form login (writes cookieFile); used by `signaler auth login` or auto with --lab-auth. */
  readonly login?: ApexAuthLoginConfig;
}

/**
 * Top-level configuration for an audit run.
 */
export interface ApexConfig {
  readonly baseUrl: string;
  readonly query?: string;
  readonly buildId?: string;
  readonly chromePort?: number;
  readonly runs?: number;
  readonly auditTimeoutMs?: number;
  readonly gitIgnoreSignalerDir?: boolean;
  readonly logLevel?: "silent" | "error" | "info" | "verbose";
  /**
   * Throttling method for performance simulation.
   * - "simulate" (default): Fast but may produce lower scores than browser DevTools.
   * - "devtools": More accurate, matches Chrome DevTools results.
   */
  readonly throttlingMethod?: ApexThrottlingMethod;
  /**
   * CPU slowdown multiplier. Default is 4 (simulates mid-tier mobile device).
   * Lower values (1-2) for weaker host machines, higher (6-10) for powerful desktops.
   * Use Lighthouse's benchmark calculator to find optimal value for your machine.
   */
  readonly cpuSlowdownMultiplier?: number;
  /**
   * Number of pages to audit in parallel. Default is 1 (sequential).
   * Higher values speed up batch testing but may reduce accuracy due to resource contention.
   * Auto-default: up to 4 based on CPU/memory. Recommended: 2-4 for speed, 1 for most accurate results.
   */
  readonly parallel?: number;
  /**
   * Browser session isolation strategy for Lighthouse audits.
   * - "shared" (default): reuse a Chrome session for speed.
   * - "per-audit": create a fresh Chrome session per audit for better reproducibility.
   */
  readonly sessionIsolation?: "shared" | "per-audit";
  /**
   * Throughput worker backoff policy when parallel workers become unstable.
   * - "auto": balanced retry/backoff behavior (default for throughput mode).
   * - "aggressive": reduce parallelism faster under errors.
   * - "off": disable adaptive parallel backoff (retries still occur).
   */
  readonly throughputBackoff?: ApexThroughputBackoffPolicy;
  /**
   * Whether to perform a warm-up request before auditing.
   * Helps avoid cold start penalties on the first audit.
   */
  readonly warmUp?: boolean;
  /**
   * Fast HTTP probe before Lighthouse; skips auth-wall and unreachable routes (default true).
   */
  readonly routePreflight?: boolean;
  /** Session cookies for authenticated route audits (preflight + Lighthouse). */
  readonly auth?: ApexAuthConfig;
  /**
   * Ephemeral env vars injected only into Signaler's managed `start` process.
   * Use app audit-bypass flags (e.g. DEMO_AUTH_BYPASS) without editing project .env or using dev mode.
   */
  readonly serveEnv?: Readonly<Record<string, string>>;
  /**
   * Include yellow performance issues in triage and TUI (default: off on lean / when omitted).
   * `false` = red-only — recommended for production optimization rounds.
   */
  readonly perfIncludeYellow?: boolean;
  readonly incremental?: boolean;
  readonly pages: readonly ApexPageConfig[];
  readonly budgets?: ApexBudgets;
  /**
   * Optional route list controls applied to `pages` before each run.
   * Use exact paths or prefix patterns ending with `*` (e.g. `/blog/*`).
   */
  readonly routes?: {
    readonly includePaths?: readonly string[];
    readonly excludePaths?: readonly string[];
  };
  /**
   * When incremental skip is enabled, combos meeting these thresholds in the prior run are not re-audited.
   */
  readonly incrementalSkip?: {
    readonly enabled?: boolean;
    readonly minPerformanceScore?: number;
    readonly minAccessibilityScore?: number;
    readonly minBestPracticesScore?: number;
    readonly minSeoScore?: number;
    readonly maxFailedAudits?: number;
    readonly requireNoRuntimeErrors?: boolean;
  };
  /**
   * Policy gates for CI (v4.3): issue-count perf limits, category floors, optional headers pass.
   * Evaluated after run when enabled, in CI mode, or with --fail-on-quality-gate.
   */
  readonly qualityGate?: QualityGateConfig;
  /**
   * Compare current run artifacts to a baseline directory (e.g. main branch CI output).
   */
  readonly baselineCompare?: BaselineCompareConfig;
  /**
   * Thresholds for bundled quality profiles (v5) — headers, links, bundle pack gate.
   */
  readonly qualityPack?: QualityPackConfig;
}

/**
 * Baseline regression policy (v4.3).
 */
export interface BaselineCompareConfig {
  readonly enabled?: boolean;
  /** Relative to project cwd, or absolute. Overridden by SIGNALER_BASELINE_DIR. */
  readonly baselineDir?: string;
  /** Allowed increase in performance-triage totals.red (default 0). */
  readonly maxRedIncrease?: number;
  readonly maxActionableIncrease?: number;
  readonly requireComparabilityMatch?: boolean;
  readonly failOnIncomparable?: boolean;
  /** Benchmark signal plane regression policy (v6C). */
  readonly benchmarkFamilies?: {
    readonly enabled?: boolean;
    /** Max allowed increase in benchmark record count per family (default 0). */
    readonly maxRecordIncrease?: number;
  };
  /** Quality pack summary regression policy (v6C). */
  readonly qualityPack?: {
    readonly enabled?: boolean;
    readonly maxHeaderFailureIncrease?: number;
    readonly maxBrokenLinkIncrease?: number;
    readonly maxHealthErrorIncrease?: number;
    readonly maxConsoleErrorComboIncrease?: number;
    readonly maxAccessibilityCriticalIncrease?: number;
    readonly maxAccessibilitySeriousIncrease?: number;
  };
}

/**
 * Quality gate thresholds (policy-as-code).
 */
export interface QualityGateConfig {
  readonly enabled?: boolean;
  /** Max performance triage `totals.red` (issue instances across combos). */
  readonly maxRedPerfIssues?: number;
  /** Max deduplicated red issues in `uniqueIssues`. */
  readonly maxUniqueRedIssues?: number;
  /** Minimum median category scores (0–100) from performance-triage.json. */
  readonly minCategoryScores?: CategoryBudgetThresholds;
  /** Fail when headers.json is missing or any route has missing headers / runtime errors. */
  readonly requireHeadersPass?: boolean;
}

/**
 * Unified pack gate for `--quality-profile` jobs (v5).
 */
export interface QualityPackConfig {
  readonly maxHeaderFailures?: number;
  readonly maxBrokenLinks?: number;
  readonly maxHealthErrors?: number;
  readonly maxConsoleErrorCombos?: number;
  readonly maxMeasureRuntimeErrors?: number;
  readonly maxAccessibilityCriticalViolations?: number;
  readonly maxAccessibilitySeriousViolations?: number;
  readonly maxAccessibilityRuntimeErrors?: number;
  /** Unified benchmark signal plane gates (v6B) — inherits runner limits when family limits omitted. */
  readonly benchmarkSignals?: {
    readonly enabled?: boolean;
    readonly requireBridge?: boolean;
    readonly highLatencyMs?: number;
    readonly securityBaseline?: {
      readonly maxRecords?: number;
      readonly maxMissingHeaders?: number;
      readonly maxTlsConfigIssues?: number;
    };
    readonly accessibilityExtended?: {
      readonly maxRecords?: number;
      readonly maxCriticalViolations?: number;
      readonly maxSeriousViolations?: number;
    };
    readonly reliabilitySlo?: {
      readonly maxRecords?: number;
      readonly maxHighLatencyRoutes?: number;
    };
    readonly seoTechnical?: {
      readonly maxRecords?: number;
      readonly maxIndexabilityIssues?: number;
      readonly maxCrawlabilityIssues?: number;
    };
  };
}

/**
 * Normalized metric values collected per run.
 */
export interface MetricValues {
  readonly lcpMs?: number;
  readonly fcpMs?: number;
  readonly tbtMs?: number;
  readonly cls?: number;
  readonly inpMs?: number;
}

/**
 * Normalized category scores collected per run.
 */
export interface CategoryScores {
  readonly performance?: number;
  readonly accessibility?: number;
  readonly bestPractices?: number;
  readonly seo?: number;
}

/**
 * Lighthouse category keys used in scoring.
 */
export type ApexCategory = "performance" | "accessibility" | "best-practices" | "seo";

/**
 * Summary of a failed audit (score < 0.9).
 */
export interface FailedAuditSummary {
  readonly id: string;
  readonly title: string;
  readonly description: string;
  readonly score: number;
  readonly scoreDisplayMode: string;
  readonly details?: any;
}

/**
 * Summary information for an opportunity.
 */
export interface OpportunitySummary {
  readonly id: string;
  readonly title: string;
  readonly estimatedSavingsMs?: number;
  readonly estimatedSavingsBytes?: number;
}

/**
 * Basic numeric statistics computed from multiple runs.
 */
export interface NumericStats {
  readonly n: number;
  readonly min: number;
  readonly max: number;
  readonly mean: number;
  readonly median: number;
  readonly p75: number;
  readonly stddev: number;
}

/**
 * Aggregated statistics for a page/device combo across multiple runs.
 */
export interface ComboRunStats {
  readonly scores: {
    readonly performance?: NumericStats;
    readonly accessibility?: NumericStats;
    readonly bestPractices?: NumericStats;
    readonly seo?: NumericStats;
  };
  readonly metrics: {
    readonly lcpMs?: NumericStats;
    readonly fcpMs?: NumericStats;
    readonly tbtMs?: NumericStats;
    readonly cls?: NumericStats;
    readonly inpMs?: NumericStats;
  };
}

/**
 * Summary data for a single audited page/device.
 */
export interface PageDeviceSummary {
  readonly url: string;
  readonly path: string;
  readonly label: string;
  readonly device: ApexDevice;
  readonly pageScope?: ApexPageScope;
  readonly scores: CategoryScores;
  readonly metrics: MetricValues;
  readonly opportunities: readonly OpportunitySummary[];
  readonly failedAudits: readonly FailedAuditSummary[];
  readonly runStats?: ComboRunStats;
  readonly runtimeErrorCode?: string;
  readonly runtimeErrorMessage?: string;
}

/**
 * Metadata describing a run execution.
 */
export interface RunMeta {
  readonly configPath: string;
  readonly buildId?: string;
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
  readonly throttlingMethod: ApexThrottlingMethod;
  readonly cpuSlowdownMultiplier: number;
  readonly startedAt: string;
  readonly completedAt: string;
  readonly elapsedMs: number;
  readonly averageStepMs: number;
  readonly runnerStability?: {
    readonly backoffPolicy: ApexThroughputBackoffPolicy;
    readonly initialParallel: number;
    readonly finalParallel: number;
    readonly totalAttempts: number;
    readonly totalFailures: number;
    readonly totalRetries: number;
    readonly reductions: number;
    readonly cooldownPauses: number;
    readonly failureRate?: number;
    readonly retryRate?: number;
    readonly maxConsecutiveRetries?: number;
    readonly cooldownMsTotal?: number;
    readonly recoveryIncreases?: number;
    readonly status?: "stable" | "degraded" | "unstable";
  };
  readonly scoreCoverage?: {
    readonly scored: number;
    readonly total: number;
    readonly skipped: number;
    readonly expectedToScore: number;
    readonly rate: number;
  };
  readonly labAuth?: {
    readonly enabled: boolean;
    readonly mode: string;
    readonly probeValidated?: boolean;
  };
  readonly excludedAtInit?: readonly {
    readonly label: string;
    readonly path: string;
    readonly status: "auth-wall" | "unreachable";
    readonly reason: string;
  }[];
  readonly excludedAtInitCombos?: number;
}

/**
 * Run summary containing metadata and results.
 */
export interface RunSummary {
  readonly meta: RunMeta;
  readonly results: readonly PageDeviceSummary[];
}
