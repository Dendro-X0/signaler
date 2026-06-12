import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import type { PerformanceTriageV3 } from "./engine-contracts/artifacts/v3/index.js";
import type { RunProtocolV3 } from "./engine-contracts/artifacts/v3/run-v3.js";
import type { VerifyReportV6 } from "./engine-contracts/artifacts/v6/index.js";
import { isVerifyReportV6 } from "./engine-contracts/artifacts/v6/index.js";
import { isPerformanceTriageV3 } from "./performance-triage.js";
import { buildSignalPlaneDeltas, type BenchmarkSignalPlaneDelta, type QualityPackDelta } from "./query-delta-benchmark.js";

export type DeltaComparability = {
  readonly matched: boolean;
  readonly baselineDir: string;
  readonly compareDir: string;
  readonly baselineHash?: string;
  readonly compareHash?: string;
  readonly baselineMode?: string;
  readonly compareMode?: string;
  readonly warnings: readonly string[];
};

export type DeltaProjection = {
  readonly view: "delta";
  readonly source: "verify.json" | "compare";
  readonly comparability?: DeltaComparability;
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
  /** Side-runner + benchmark bridge deltas (v6C). */
  readonly qualityPack?: QualityPackDelta;
  readonly benchmarkSignals?: BenchmarkSignalPlaneDelta;
  readonly headlines?: readonly string[];
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

async function loadRunProtocol(dir: string): Promise<RunProtocolV3 | undefined> {
  try {
    const parsed = await readJson(resolve(dir, "run.json"));
    if (typeof parsed !== "object" || parsed === null) {
      return undefined;
    }
    const protocol = (parsed as { readonly protocol?: unknown }).protocol;
    if (typeof protocol !== "object" || protocol === null) {
      return undefined;
    }
    const record = protocol as Record<string, unknown>;
    if (typeof record.comparabilityHash !== "string" || typeof record.mode !== "string") {
      return undefined;
    }
    return protocol as RunProtocolV3;
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

async function buildComparability(params: {
  readonly baselineDir: string;
  readonly compareDir: string;
}): Promise<DeltaComparability> {
  const warnings: string[] = [];
  const beforeTriage = await loadPerformanceTriage(params.baselineDir);
  const afterTriage = await loadPerformanceTriage(params.compareDir);
  const beforeRun = await loadRunProtocol(params.baselineDir);
  const afterRun = await loadRunProtocol(params.compareDir);

  let matched = true;
  if (beforeRun !== undefined && afterRun !== undefined && beforeRun.comparabilityHash !== afterRun.comparabilityHash) {
    matched = false;
    warnings.push(
      `run.json comparabilityHash differs (baseline ${beforeRun.comparabilityHash} vs compare ${afterRun.comparabilityHash}).`,
    );
  }
  if (
    beforeTriage !== undefined
    && afterTriage !== undefined
    && beforeTriage.comparabilityHash !== afterTriage.comparabilityHash
  ) {
    matched = false;
    warnings.push(
      `performance-triage comparabilityHash differs (baseline ${beforeTriage.comparabilityHash} vs compare ${afterTriage.comparabilityHash}).`,
    );
  }
  if (beforeRun !== undefined && afterRun !== undefined && beforeRun.mode !== afterRun.mode) {
    warnings.push(`Run mode differs (baseline ${beforeRun.mode} vs compare ${afterRun.mode}); score deltas may not be meaningful.`);
  }

  return {
    matched,
    baselineDir: params.baselineDir,
    compareDir: params.compareDir,
    baselineHash: beforeRun?.comparabilityHash ?? beforeTriage?.comparabilityHash,
    compareHash: afterRun?.comparabilityHash ?? afterTriage?.comparabilityHash,
    baselineMode: beforeRun?.mode ?? beforeTriage?.mode,
    compareMode: afterRun?.mode ?? afterTriage?.mode,
    warnings,
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
    const comparability = await buildComparability({
      baselineDir: params.baselineDir,
      compareDir: params.compareDir,
    });
    const beforeTotals = totalsFromTriage(before);
    const afterTotals = totalsFromTriage(after);
    const signalPlane = await buildSignalPlaneDeltas({
      baselineDir: params.baselineDir,
      compareDir: params.compareDir,
    });
    const headlines = [
      `Performance red issues: ${afterTotals.red - beforeTotals.red >= 0 ? "+" : ""}${afterTotals.red - beforeTotals.red}`,
      ...(signalPlane.qualityPack?.headlines ?? []),
      ...(signalPlane.benchmarkSignals?.headlines ?? []),
    ];
    return {
      view: "delta",
      source: "compare",
      comparability,
      performance: {
        before: beforeTotals,
        after: afterTotals,
        delta: {
          actionable: afterTotals.actionable - beforeTotals.actionable,
          red: afterTotals.red - beforeTotals.red,
          yellow: afterTotals.yellow - beforeTotals.yellow,
        },
      },
      ...(signalPlane.qualityPack !== undefined ? { qualityPack: signalPlane.qualityPack } : {}),
      ...(signalPlane.benchmarkSignals !== undefined ? { benchmarkSignals: signalPlane.benchmarkSignals } : {}),
      ...(headlines.length > 0 ? { headlines } : {}),
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
    comparability: {
      matched: verify.comparability.matched,
      baselineDir: verify.baseline.dir,
      compareDir: verify.rerun.dir,
      baselineHash: verify.baseline.comparabilityHash,
      compareHash: verify.rerun.comparabilityHash,
      warnings: verify.comparability.matched
        ? []
        : [
            `verify comparability mismatch: baseline ${verify.baseline.comparabilityHash} vs rerun ${verify.rerun.comparabilityHash}.`,
          ],
    },
  };

  if (beforeTriage !== undefined && afterTriage !== undefined) {
    const beforeTotals = totalsFromTriage(beforeTriage);
    const afterTotals = totalsFromTriage(afterTriage);
    const signalPlane = await buildSignalPlaneDeltas({
      baselineDir: verify.baseline.dir,
      compareDir: verify.rerun.dir,
    });
    const headlines = [
      `Performance red issues: ${afterTotals.red - beforeTotals.red >= 0 ? "+" : ""}${afterTotals.red - beforeTotals.red}`,
      ...(signalPlane.qualityPack?.headlines ?? []),
      ...(signalPlane.benchmarkSignals?.headlines ?? []),
    ];
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
      ...(signalPlane.qualityPack !== undefined ? { qualityPack: signalPlane.qualityPack } : {}),
      ...(signalPlane.benchmarkSignals !== undefined ? { benchmarkSignals: signalPlane.benchmarkSignals } : {}),
      ...(headlines.length > 0 ? { headlines } : {}),
    };
  }

  return projection;
}
