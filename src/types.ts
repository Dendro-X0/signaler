/**
 * Device type for audit execution.
 * Determines the viewport size and user agent used during audits.
 */
export type ApexDevice = "mobile" | "desktop";

/**
 * Page access scope for authentication requirements.
 * Helps categorize pages based on their access requirements.
 */
export type ApexPageScope = "public" | "requires-auth";

/**
 * Throttling method for Lighthouse audits.
 * - "simulate": Fast, uses simulation (default). May produce lower scores than DevTools.
 * - "devtools": More accurate, matches Chrome DevTools results but slower.
 */
export type ApexThrottlingMethod = "simulate" | "devtools";

/**
 * Configuration for a single page to be audited.
 * Defines the path, label, target devices, and access scope.
 * 
 * @example
 * ```typescript
 * const pageConfig: ApexPageConfig = {
 *   path: "/products",
 *   label: "Products Page",
 *   devices: ["mobile", "desktop"],
 *   scope: "public"
 * };
 * ```
 */
export interface ApexPageConfig {
  readonly path: string;
  readonly label: string;
  readonly devices: readonly ApexDevice[];
  readonly scope?: ApexPageScope;
}

/**
 * Performance budget thresholds for Lighthouse categories.
 * Defines minimum acceptable scores (0-100) for each category.
 * 
 * @example
 * ```typescript
 * const budgets: CategoryBudgetThresholds = {
 *   performance: 90,
 *   accessibility: 95,
 *   bestPractices: 85,
 *   seo: 90
 * };
 * ```
 */
export interface CategoryBudgetThresholds {
  readonly performance?: number;
  readonly accessibility?: number;
  readonly bestPractices?: number;
  readonly seo?: number;
}

/**
 * Performance budget thresholds for Core Web Vitals metrics.
 * Defines maximum acceptable values for key performance metrics.
 * 
 * @example
 * ```typescript
 * const metricBudgets: MetricBudgetThresholds = {
 *   lcpMs: 2500,    // Largest Contentful Paint
 *   fcpMs: 1800,    // First Contentful Paint
 *   tbtMs: 300,     // Total Blocking Time
 *   cls: 0.1,       // Cumulative Layout Shift
 *   inpMs: 200      // Interaction to Next Paint
 * };
 * ```
 */
export interface MetricBudgetThresholds {
  readonly lcpMs?: number;
  readonly fcpMs?: number;
  readonly tbtMs?: number;
  readonly cls?: number;
  readonly inpMs?: number;
}

/**
 * Complete performance budget configuration.
 * Combines category scores and metric thresholds for comprehensive budget enforcement.
 * 
 * @example
 * ```typescript
 * const budgets: ApexBudgets = {
 *   categories: {
 *     performance: 90,
 *     accessibility: 95
 *   },
 *   metrics: {
 *     lcpMs: 2500,
 *     cls: 0.1
 *   }
 * };
 * ```
 */
export interface ApexBudgets {
  readonly categories?: CategoryBudgetThresholds;
  readonly metrics?: MetricBudgetThresholds;
}

/**
 * Main configuration interface for Signaler audits.
 * Defines all settings for audit execution including pages, performance budgets,
 * and execution parameters.
 * 
 * @example
 * ```typescript
 * const config: ApexConfig = {
 *   baseUrl: "http://localhost:3000",
 *   throttlingMethod: "simulate",
 *   parallel: 2,
 *   warmUp: true,
 *   pages: [
 *     { path: "/", label: "Home", devices: ["mobile", "desktop"] },
 *     { path: "/about", label: "About", devices: ["mobile"] }
 *   ],
 *   budgets: {
 *     categories: { performance: 90 },
 *     metrics: { lcpMs: 2500 }
 *   }
 * };
 * ```
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
   * Whether to perform a warm-up request before auditing.
   * Helps avoid cold start penalties on the first audit.
   */
  readonly warmUp?: boolean;
  readonly incremental?: boolean;
  readonly pages: readonly ApexPageConfig[];
  readonly budgets?: ApexBudgets;
}

/**
 * Collected performance metric values for a single run.
 */
export interface MetricValues {
  readonly lcpMs?: number;
  readonly fcpMs?: number;
  readonly tbtMs?: number;
  readonly cls?: number;
  readonly inpMs?: number;
}

/**
 * Lighthouse category scores for a single run.
 */
export interface CategoryScores {
  readonly performance?: number;
  readonly accessibility?: number;
  readonly bestPractices?: number;
  readonly seo?: number;
}

/**
 * Supported Lighthouse category identifiers.
 */
export type ApexCategory = "performance" | "accessibility" | "best-practices" | "seo";

/**
 * Summary of an optimization opportunity and its estimated savings.
 */
export interface OpportunitySummary {
  readonly id: string;
  readonly title: string;
  readonly estimatedSavingsMs?: number;
  readonly estimatedSavingsBytes?: number;
}

/**
 * Numeric distribution statistics.
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
 * Aggregated statistics across a page/device combo run.
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
 * Summary of a single audited page/device pair.
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
  readonly runStats?: ComboRunStats;
  readonly runtimeErrorCode?: string;
  readonly runtimeErrorMessage?: string;
}

/**
 * Metadata describing an audit run.
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
}

/**
 * Aggregate summary output for an audit run.
 */
export interface RunSummary {
  readonly meta: RunMeta;
  readonly results: readonly PageDeviceSummary[];
}
