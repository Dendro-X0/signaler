import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import type { ApexConfig, ApexDevice, ApexPageConfig } from "./core/types.js";
import { isResultsV3 } from "./engine-contracts/artifacts/v3/index.js";
import type { PageDeviceSummary } from "./types.js";

export type IncrementalSkipCriteria = {
  readonly minPerformanceScore?: number;
  readonly minAccessibilityScore?: number;
  readonly minBestPracticesScore?: number;
  readonly minSeoScore?: number;
  readonly maxFailedAudits?: number;
  readonly requireNoRuntimeErrors?: boolean;
};

export type RouteListFilter = NonNullable<ApexConfig["routes"]>;

export const DEFAULT_INCREMENTAL_SKIP_CRITERIA: IncrementalSkipCriteria = {
  minPerformanceScore: 90,
  minAccessibilityScore: 90,
  minBestPracticesScore: 90,
  minSeoScore: 90,
  maxFailedAudits: 0,
  requireNoRuntimeErrors: true,
};

export function resolveIncrementalSkipCriteria(params: {
  readonly fromConfig?: IncrementalSkipCriteria | null;
  readonly cliOverrides?: Partial<IncrementalSkipCriteria>;
}): IncrementalSkipCriteria {
  return {
    ...DEFAULT_INCREMENTAL_SKIP_CRITERIA,
    ...params.fromConfig,
    ...params.cliOverrides,
  };
}

function pathMatchesPattern(path: string, pattern: string): boolean {
  const normalized = pattern.trim();
  if (normalized.length === 0) {
    return false;
  }
  if (normalized.endsWith("*")) {
    const prefix = normalized.slice(0, -1).replace(/\/$/, "");
    if (prefix.length === 0) {
      return true;
    }
    return path === prefix || path.startsWith(`${prefix}/`);
  }
  return path === normalized;
}

function pathMatchesAny(path: string, patterns: readonly string[]): boolean {
  return patterns.some((pattern) => pathMatchesPattern(path, pattern));
}

export function applyRouteListFilter(pages: readonly ApexPageConfig[], filter?: RouteListFilter): readonly ApexPageConfig[] {
  if (!filter) {
    return pages;
  }
  const include = filter.includePaths?.filter((value) => value.trim().length > 0) ?? [];
  const exclude = filter.excludePaths?.filter((value) => value.trim().length > 0) ?? [];
  return pages.filter((page) => {
    if (include.length > 0 && !pathMatchesAny(page.path, include)) {
      return false;
    }
    if (exclude.length > 0 && pathMatchesAny(page.path, exclude)) {
      return false;
    }
    return true;
  });
}

function comboKey(page: ApexPageConfig, device: ApexDevice): string {
  return `${page.label}:::${page.path}:::${device}`;
}

function scoreMeetsMinimum(score: number | undefined, minimum: number | undefined): boolean {
  if (minimum === undefined) {
    return true;
  }
  return typeof score === "number" && score >= minimum;
}

export function comboMeetsIncrementalSkipCriteria(
  result: PageDeviceSummary,
  criteria: IncrementalSkipCriteria,
): boolean {
  if (criteria.requireNoRuntimeErrors === true && result.runtimeErrorMessage) {
    return false;
  }
  const failedCount = result.failedAudits?.length ?? 0;
  if (criteria.maxFailedAudits !== undefined && failedCount > criteria.maxFailedAudits) {
    return false;
  }
  if (!scoreMeetsMinimum(result.scores.performance, criteria.minPerformanceScore)) {
    return false;
  }
  if (!scoreMeetsMinimum(result.scores.accessibility, criteria.minAccessibilityScore)) {
    return false;
  }
  if (!scoreMeetsMinimum(result.scores.bestPractices, criteria.minBestPracticesScore)) {
    return false;
  }
  if (!scoreMeetsMinimum(result.scores.seo, criteria.minSeoScore)) {
    return false;
  }
  return true;
}

/** Remove page/device combos that already passed the incremental skip criteria in a prior run. */
export function filterConfigSkipPassing(params: {
  readonly previous: readonly PageDeviceSummary[];
  readonly config: ApexConfig;
  readonly criteria: IncrementalSkipCriteria;
}): { readonly config: ApexConfig; readonly skippedCombos: number } {
  const skipKeys = new Set<string>();
  for (const result of params.previous) {
    if (comboMeetsIncrementalSkipCriteria(result, params.criteria)) {
      skipKeys.add(`${result.label}:::${result.path}:::${result.device}`);
    }
  }
  let skippedCombos = 0;
  const pages: ApexPageConfig[] = params.config.pages.flatMap((page) => {
    const devices: readonly ApexDevice[] = page.devices.filter((device) => {
      const key = comboKey(page, device);
      if (skipKeys.has(key)) {
        skippedCombos += 1;
        return false;
      }
      return true;
    });
    if (devices.length === 0) {
      return [];
    }
    return [{ ...page, devices }];
  });
  return { config: { ...params.config, pages }, skippedCombos };
}

/** Keep only combos that failed thresholds in a prior run (existing rerun-failing behavior). */
export function filterConfigFailing(params: {
  readonly previous: readonly PageDeviceSummary[];
  readonly config: ApexConfig;
  readonly minPerformanceScore?: number;
}): ApexConfig {
  const minPerformance = params.minPerformanceScore ?? 90;
  const failing = new Set<string>();
  for (const result of params.previous) {
    const runtimeFailed: boolean = Boolean(result.runtimeErrorMessage);
    const perfScore: number | undefined = result.scores.performance;
    const failedScore: boolean = typeof perfScore === "number" && perfScore < minPerformance;
    if (runtimeFailed || failedScore) {
      failing.add(`${result.label}:::${result.path}:::${result.device}`);
    }
  }
  const pages: ApexPageConfig[] = params.config.pages.flatMap((page) => {
    const devices: readonly ApexDevice[] = page.devices.filter((device) =>
      failing.has(comboKey(page, device)),
    );
    if (devices.length === 0) {
      return [];
    }
    return [{ ...page, devices }];
  });
  return { ...params.config, pages };
}

export async function loadPreviousRunResults(outputDir: string): Promise<readonly PageDeviceSummary[] | undefined> {
  const root = resolve(outputDir);
  try {
    const summaryRaw = JSON.parse(await readFile(resolve(root, "summary.json"), "utf8")) as {
      readonly results?: readonly PageDeviceSummary[];
    };
    if (Array.isArray(summaryRaw.results) && summaryRaw.results.length > 0) {
      return summaryRaw.results;
    }
  } catch {
    // fall through
  }
  try {
    const resultsRaw: unknown = JSON.parse(await readFile(resolve(root, "results.json"), "utf8"));
    if (isResultsV3(resultsRaw)) {
      return resultsRaw.results as readonly PageDeviceSummary[];
    }
  } catch {
    return undefined;
  }
  return undefined;
}

export function applyConfigRoutePlan(config: ApexConfig): ApexConfig {
  const filtered = applyRouteListFilter(config.pages, config.routes);
  if (filtered.length === config.pages.length) {
    return config;
  }
  return { ...config, pages: filtered };
}
