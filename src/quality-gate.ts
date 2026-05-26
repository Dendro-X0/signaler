import type { PerformanceTriageV3 } from "./engine-contracts/artifacts/v3/index.js";
import type { CategoryBudgetThresholds, QualityGateConfig } from "./core/types.js";

export type QualityGateViolation = {
  readonly id: string;
  readonly message: string;
  readonly severity: "critical";
};

export type QualityGateResult = {
  readonly passed: boolean;
  readonly violations: readonly QualityGateViolation[];
  readonly evaluatedAt: string;
  readonly summary: {
    readonly redPerfIssues: number;
    readonly uniqueRedIssues: number;
    readonly categoryScores: {
      readonly accessibility?: number;
      readonly bestPractices?: number;
      readonly seo?: number;
    };
    readonly headersChecked: boolean;
    readonly headersFailedTargets: number;
  };
};

export type HeadersGateInput = {
  readonly results: readonly {
    readonly label: string;
    readonly path: string;
    readonly missing: readonly string[];
    readonly runtimeErrorMessage?: string;
  }[];
};

export function isQualityGateActive(
  gate: QualityGateConfig | undefined,
  params: { readonly ci: boolean; readonly failOnQualityGate: boolean },
): boolean {
  if (gate === undefined) {
    return false;
  }
  if (params.failOnQualityGate) {
    return true;
  }
  if (!params.ci) {
    return gate.enabled === true;
  }
  return gate.enabled !== false;
}

export function evaluateQualityGate(params: {
  readonly gate: QualityGateConfig;
  readonly triage: PerformanceTriageV3;
  readonly headers?: HeadersGateInput | null;
}): QualityGateResult {
  const violations: QualityGateViolation[] = [];
  const uniqueRedIssues = params.triage.uniqueIssues.filter((issue) => issue.severity === "red").length;
  const redPerfIssues = params.triage.totals.red;

  if (typeof params.gate.maxRedPerfIssues === "number" && redPerfIssues > params.gate.maxRedPerfIssues) {
    violations.push({
      id: "max-red-perf-issues",
      message: `Red performance issue count ${redPerfIssues} exceeds max ${params.gate.maxRedPerfIssues} (see performance-triage.json totals.red).`,
      severity: "critical",
    });
  }

  if (typeof params.gate.maxUniqueRedIssues === "number" && uniqueRedIssues > params.gate.maxUniqueRedIssues) {
    violations.push({
      id: "max-unique-red-issues",
      message: `Unique red performance issues ${uniqueRedIssues} exceeds max ${params.gate.maxUniqueRedIssues}.`,
      severity: "critical",
    });
  }

  const mins = params.gate.minCategoryScores;
  if (mins !== undefined) {
    const scores = params.triage.categoryScores;
    const check = (key: keyof CategoryBudgetThresholds, label: string, actual?: number) => {
      const min = mins[key];
      if (typeof min !== "number" || actual === undefined) {
        return;
      }
      if (actual < min) {
        violations.push({
          id: `min-${label}-score`,
          message: `Median ${label} score ${actual} is below minimum ${min}.`,
          severity: "critical",
        });
      }
    };
    check("accessibility", "accessibility", scores.accessibility);
    check("bestPractices", "best-practices", scores.bestPractices);
    check("seo", "seo", scores.seo);
  }

  let headersChecked = false;
  let headersFailedTargets = 0;
  if (params.gate.requireHeadersPass === true) {
    if (params.headers === null || params.headers === undefined) {
      violations.push({
        id: "headers-missing",
        message: "qualityGate.requireHeadersPass is set but .signaler/headers.json was not found. Run `signaler headers` first.",
        severity: "critical",
      });
    } else {
      headersChecked = true;
      headersFailedTargets = params.headers.results.filter(
        (row) => row.missing.length > 0 || Boolean(row.runtimeErrorMessage),
      ).length;
      if (headersFailedTargets > 0) {
        violations.push({
          id: "headers-failed",
          message: `${headersFailedTargets} route(s) failed security headers checks (see headers.json).`,
          severity: "critical",
        });
      }
    }
  }

  return {
    passed: violations.length === 0,
    violations,
    evaluatedAt: new Date().toISOString(),
    summary: {
      redPerfIssues,
      uniqueRedIssues,
      categoryScores: {
        accessibility: params.triage.categoryScores.accessibility,
        bestPractices: params.triage.categoryScores.bestPractices,
        seo: params.triage.categoryScores.seo,
      },
      headersChecked,
      headersFailedTargets,
    },
  };
}

export function getQualityGateExitCode(
  result: QualityGateResult,
  params: { readonly ci: boolean; readonly failOnQualityGate: boolean; readonly gate?: QualityGateConfig },
): number {
  if (!isQualityGateActive(params.gate, params)) {
    return 0;
  }
  return result.passed ? 0 : 1;
}
