import type { ApexDevice } from "../../core/types.js";

/**
 * Timing metrics collected during a measurement run.
 */
export type MeasureTiming = {
  readonly ttfbMs?: number;
  readonly domContentLoadedMs?: number;
  readonly loadMs?: number;
};

/**
 * Web vitals captured during a measurement run.
 */
export type MeasureVitals = {
  readonly lcpMs?: number;
  readonly cls?: number;
  readonly inpMs?: number;
};

/**
 * Summary statistics about long tasks detected on the page.
 */
export type MeasureLongTasks = {
  readonly count: number;
  readonly totalMs: number;
  readonly maxMs: number;
};

/**
 * Network statistics captured during the measurement run.
 */
export type MeasureNetwork = {
  readonly totalRequests: number;
  readonly totalBytes: number;
  readonly thirdPartyRequests: number;
  readonly thirdPartyBytes: number;
  readonly cacheHitRatio: number;
  readonly lateScriptRequests: number;
};

/**
 * Paths and lightweight artifacts captured during measurement.
 */
export type MeasureArtifacts = {
  readonly screenshotPath?: string;
  readonly consoleErrors: readonly string[];
};

/**
 * Result summary for a single page/device measurement combination.
 */
export type MeasurePageDeviceSummary = {
  readonly url: string;
  readonly path: string;
  readonly label: string;
  readonly device: ApexDevice;
  readonly timings: MeasureTiming;
  readonly vitals: MeasureVitals;
  readonly longTasks: MeasureLongTasks;
  readonly scriptingDurationMs?: number;
  readonly network: MeasureNetwork;
  readonly artifacts: MeasureArtifacts;
  readonly runtimeErrorMessage?: string;
};

/**
 * Metadata describing a measurement run.
 */
export type MeasureMeta = {
  readonly configPath: string;
  readonly resolvedParallel: number;
  readonly comboCount: number;
  readonly startedAt: string;
  readonly completedAt: string;
  readonly elapsedMs: number;
  readonly averageComboMs: number;
};

/**
 * Aggregate summary output for a measurement run.
 */
export type MeasureSummary = {
  readonly meta: MeasureMeta;
  readonly results: readonly MeasurePageDeviceSummary[];
};