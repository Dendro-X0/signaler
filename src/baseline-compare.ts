import { access } from "node:fs/promises";
import { resolve } from "node:path";
import type { BaselineCompareConfig } from "./core/types.js";
import { buildDeltaProjection, type DeltaProjection } from "./query-delta.js";
import type { QualityGateViolation } from "./quality-gate.js";

export type BaselineCompareResult = {
  readonly passed: boolean;
  readonly violations: readonly QualityGateViolation[];
  readonly evaluatedAt: string;
  readonly baselineDir: string;
  readonly compareDir: string;
  readonly delta: DeltaProjection;
};

export function resolveBaselineDir(params: {
  readonly cwd: string;
  readonly config?: BaselineCompareConfig;
}): string | undefined {
  const fromEnv = process.env.SIGNALER_BASELINE_DIR?.trim();
  if (fromEnv && fromEnv.length > 0) {
    return resolve(fromEnv);
  }
  if (params.config?.baselineDir !== undefined && params.config.baselineDir.trim().length > 0) {
    return resolve(params.cwd, params.config.baselineDir);
  }
  return undefined;
}

export function isBaselineCompareActive(
  config: BaselineCompareConfig | undefined,
  params: { readonly ci: boolean; readonly failOnBaselineCompare: boolean },
): boolean {
  if (config === undefined) {
    return false;
  }
  if (params.failOnBaselineCompare) {
    return true;
  }
  if (!params.ci) {
    return config.enabled === true;
  }
  return config.enabled !== false;
}

export function evaluateBaselineCompare(params: {
  readonly config: BaselineCompareConfig;
  readonly delta: DeltaProjection;
  readonly baselineDir?: string;
  readonly compareDir?: string;
}): BaselineCompareResult {
  const violations: QualityGateViolation[] = [];
  const maxRedIncrease = params.config.maxRedIncrease ?? 0;
  const maxActionableIncrease = params.config.maxActionableIncrease;
  const requireMatch = params.config.requireComparabilityMatch !== false;
  const failOnIncomparable = params.config.failOnIncomparable !== false;

  if (params.delta.comparability !== undefined) {
    if (requireMatch && !params.delta.comparability.matched) {
      const message =
        params.delta.comparability.warnings.join(" ") ||
        `Comparability mismatch: baseline ${params.delta.comparability.baselineHash ?? "?"} vs compare ${params.delta.comparability.compareHash ?? "?"}.`;
      if (failOnIncomparable) {
        violations.push({
          id: "comparability-mismatch",
          message,
          severity: "critical",
        });
      }
    }
  }

  const perfDelta = params.delta.performance?.delta;
  if (perfDelta !== undefined) {
    if (typeof maxRedIncrease === "number" && perfDelta.red > maxRedIncrease) {
      violations.push({
        id: "baseline-red-regression",
        message: `Red performance issues increased by ${perfDelta.red} (max allowed increase: ${maxRedIncrease}).`,
        severity: "critical",
      });
    }
    if (
      typeof maxActionableIncrease === "number"
      && perfDelta.actionable > maxActionableIncrease
    ) {
      violations.push({
        id: "baseline-actionable-regression",
        message: `Actionable performance issues increased by ${perfDelta.actionable} (max allowed increase: ${maxActionableIncrease}).`,
        severity: "critical",
      });
    }
  } else if (params.delta.source === "compare") {
    violations.push({
      id: "baseline-missing-triage",
      message: "Baseline compare could not compute performance deltas (missing performance-triage.json).",
      severity: "critical",
    });
  }

  return {
    passed: violations.length === 0,
    violations,
    evaluatedAt: new Date().toISOString(),
    baselineDir: params.baselineDir ?? params.delta.comparability?.baselineDir ?? "",
    compareDir: params.compareDir ?? params.delta.comparability?.compareDir ?? "",
    delta: params.delta,
  };
}

export async function runBaselineCompare(params: {
  readonly cwd: string;
  readonly compareDir: string;
  readonly config: BaselineCompareConfig;
}): Promise<BaselineCompareResult> {
  const baselineDir = resolveBaselineDir({ cwd: params.cwd, config: params.config });
  if (baselineDir === undefined) {
    throw new Error("baselineCompare requires baselineDir in config or SIGNALER_BASELINE_DIR.");
  }
  try {
    await access(baselineDir);
  } catch {
    throw new Error(`Baseline artifact directory not found: ${baselineDir}`);
  }
  const delta = await buildDeltaProjection({
    dir: params.compareDir,
    baselineDir,
    compareDir: params.compareDir,
  });
  return evaluateBaselineCompare({
    config: params.config,
    delta,
    baselineDir,
    compareDir: params.compareDir,
  });
}

export function getBaselineCompareExitCode(
  result: BaselineCompareResult,
  params: { readonly ci: boolean; readonly failOnBaselineCompare: boolean; readonly config?: BaselineCompareConfig },
): number {
  if (!isBaselineCompareActive(params.config, params)) {
    return 0;
  }
  return result.passed ? 0 : 1;
}

export function shouldFailOnDeltaProjection(
  delta: DeltaProjection,
  config?: BaselineCompareConfig,
): boolean {
  const policy: BaselineCompareConfig = config ?? { maxRedIncrease: 0, requireComparabilityMatch: true };
  return !evaluateBaselineCompare({ config: policy, delta }).passed;
}
