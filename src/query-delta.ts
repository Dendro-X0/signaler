import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import type { PerformanceTriageV3 } from "./engine-contracts/artifacts/v3/index.js";
import type { VerifyReportV6 } from "./engine-contracts/artifacts/v6/index.js";
import { isVerifyReportV6 } from "./engine-contracts/artifacts/v6/index.js";
import { isPerformanceTriageV3 } from "./performance-triage.js";

export type DeltaProjection = {
  readonly view: "delta";
  readonly source: "verify.json" | "compare";
  readonly verify?: {
    readonly status: "pass" | "fail";
    readonly passed: number;
    readonly failed: number;
    readonly skipped: number;
    readonly comparabilityMatched: boolean;
    readonly checks: readonly {
      readonly actionId: string;
      readonly actionTitle: string;
      readonly status: "pass" | "fail" | "skipped";
      readonly delta?: {
        readonly score?: number;
        readonly lcpMs?: number;
        readonly tbtMs?: number;
        readonly cls?: number;
        readonly bytes?: number;
        readonly issueCount?: number;
      };
      readonly reason?: string;
    }[];
  };
  readonly performance?: {
    readonly before: { readonly actionable: number; readonly red: number; readonly yellow: number };
    readonly after: { readonly actionable: number; readonly red: number; readonly yellow: number };
    readonly delta: { readonly actionable: number; readonly red: number; readonly yellow: number };
  };
};

async function readJson(path: string): Promise<unknown> {
  const raw = await readFile(path, "utf8");
  return JSON.parse(raw) as unknown;
}

async function loadPerformanceTriage(dir: string): Promise<PerformanceTriageV3 | undefined> {
  try {
    const parsed = await readJson(resolve(dir, "performance-triage.json"));
    return isPerformanceTriageV3(parsed) ? parsed : undefined;
  } catch {
    return undefined;
  }
}

function totalsFromTriage(triage: PerformanceTriageV3): DeltaProjection["performance"] extends undefined ? never : NonNullable<DeltaProjection["performance"]>["before"] {
  return {
    actionable: triage.totals.actionable,
    red: triage.totals.red,
    yellow: triage.totals.yellow,
  };
}

export async function buildDeltaProjection(params: {
  readonly dir: string;
  readonly baselineDir?: string;
  readonly compareDir?: string;
}): Promise<DeltaProjection> {
  if (params.baselineDir !== undefined && params.compareDir !== undefined) {
    const before = await loadPerformanceTriage(params.baselineDir);
    const after = await loadPerformanceTriage(params.compareDir);
    if (before === undefined || after === undefined) {
      throw new Error("compare mode requires performance-triage.json in both --baseline-dir and --compare-dir.");
    }
    const beforeTotals = totalsFromTriage(before);
    const afterTotals = totalsFromTriage(after);
    return {
      view: "delta",
      source: "compare",
      performance: {
        before: beforeTotals,
        after: afterTotals,
        delta: {
          actionable: afterTotals.actionable - beforeTotals.actionable,
          red: afterTotals.red - beforeTotals.red,
          yellow: afterTotals.yellow - beforeTotals.yellow,
        },
      },
    };
  }

  const verifyPath = resolve(params.dir, "verify.json");
  let verify: VerifyReportV6;
  try {
    const parsed = await readJson(verifyPath);
    if (!isVerifyReportV6(parsed)) {
      throw new Error("invalid verify.json");
    }
    verify = parsed;
  } catch {
    throw new Error(`delta view requires verify.json in ${params.dir}, or pass --baseline-dir and --compare-dir.`);
  }

  const beforeTriage = await loadPerformanceTriage(verify.baseline.dir);
  const afterTriage = await loadPerformanceTriage(verify.rerun.dir);

  const projection: DeltaProjection = {
    view: "delta",
    source: "verify.json",
    verify: {
      status: verify.summary.status,
      passed: verify.summary.passed,
      failed: verify.summary.failed,
      skipped: verify.summary.skipped,
      comparabilityMatched: verify.comparability.matched,
      checks: verify.checks.map((check) => ({
        actionId: check.actionId,
        actionTitle: check.actionTitle,
        status: check.status,
        ...(Object.keys(check.delta).length > 0 ? { delta: check.delta } : {}),
        ...(check.reason ? { reason: check.reason } : {}),
      })),
    },
  };

  if (beforeTriage !== undefined && afterTriage !== undefined) {
    const beforeTotals = totalsFromTriage(beforeTriage);
    const afterTotals = totalsFromTriage(afterTriage);
    return {
      ...projection,
      performance: {
        before: beforeTotals,
        after: afterTotals,
        delta: {
          actionable: afterTotals.actionable - beforeTotals.actionable,
          red: afterTotals.red - beforeTotals.red,
          yellow: afterTotals.yellow - beforeTotals.yellow,
        },
      },
    };
  }

  return projection;
}
