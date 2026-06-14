import type { PageDeviceSummary, RunMeta } from "./core/types.js";
import { auditScoreCoverage, classifyComboAuditStatus, type ComboAuditStatus } from "./runners/lighthouse/route-preflight.js";

export type CoverageSkipEntry = {
  readonly label: string;
  readonly path: string;
  readonly device: string;
  readonly url?: string;
  readonly reason: string;
  readonly pointer: string;
};

export type CoverageRunnerErrorEntry = {
  readonly label: string;
  readonly path: string;
  readonly device: string;
  readonly url?: string;
  readonly runtimeErrorMessage: string;
  readonly auditStatus: "runner-error" | "partial";
  readonly pointer: string;
};

export type AuditCoverageV1 = {
  readonly schemaVersion: 1;
  readonly generatedAt: string;
  readonly totals: {
    readonly combos: number;
    readonly scored: number;
    readonly skipped: number;
    readonly skippedAuth: number;
    readonly skippedUnreachable: number;
    readonly runnerErrors: number;
    readonly partial: number;
    readonly expectedToScore: number;
    readonly scoreRate: number;
  };
  readonly skippedByReason: {
    readonly authWall: readonly CoverageSkipEntry[];
    readonly unreachable: readonly CoverageSkipEntry[];
  };
  readonly runnerErrors: readonly CoverageRunnerErrorEntry[];
  readonly runnerStability?: RunMeta["runnerStability"];
  readonly guidance: {
    readonly authWall: string;
    readonly unreachable: string;
    readonly runnerError: string;
    readonly partial: string;
  };
};

function parseSkipReason(runtimeErrorMessage: string): string {
  const dashIndex = runtimeErrorMessage.indexOf(" — ");
  if (dashIndex >= 0) {
    return runtimeErrorMessage.slice(dashIndex + 3).trim();
  }
  return runtimeErrorMessage.replace(/^Skipped \([^)]+\):\s*/, "").trim();
}

export function buildAuditCoverageV1(params: {
  readonly results: readonly PageDeviceSummary[];
  readonly meta: RunMeta;
}): AuditCoverageV1 {
  const coverage = auditScoreCoverage({ summaries: params.results });
  const authWall: CoverageSkipEntry[] = [];
  const unreachable: CoverageSkipEntry[] = [];
  const runnerErrors: CoverageRunnerErrorEntry[] = [];
  let skippedAuth = 0;
  let skippedUnreachable = 0;
  let runnerErrorCount = 0;
  let partialCount = 0;

  params.results.forEach((combo) => {
    const auditStatus: ComboAuditStatus = classifyComboAuditStatus(combo);
    if (auditStatus === "skipped-auth") {
      skippedAuth += 1;
      authWall.push({
        label: combo.label,
        path: combo.path,
        device: combo.device,
        url: combo.url,
        reason: parseSkipReason(combo.runtimeErrorMessage ?? ""),
        pointer: `coverage.json#/skippedByReason/authWall/${authWall.length}`,
      });
      return;
    }
    if (auditStatus === "skipped-unreachable") {
      skippedUnreachable += 1;
      unreachable.push({
        label: combo.label,
        path: combo.path,
        device: combo.device,
        url: combo.url,
        reason: parseSkipReason(combo.runtimeErrorMessage ?? ""),
        pointer: `coverage.json#/skippedByReason/unreachable/${unreachable.length}`,
      });
      return;
    }
    if (auditStatus === "runner-error" || auditStatus === "partial") {
      if (auditStatus === "partial") {
        partialCount += 1;
      } else {
        runnerErrorCount += 1;
      }
      runnerErrors.push({
        label: combo.label,
        path: combo.path,
        device: combo.device,
        url: combo.url,
        runtimeErrorMessage: combo.runtimeErrorMessage ?? "Unknown runner error",
        auditStatus,
        pointer: `coverage.json#/runnerErrors/${runnerErrors.length}`,
      });
    }
  });

  return {
    schemaVersion: 1,
    generatedAt: new Date().toISOString(),
    totals: {
      combos: coverage.total,
      scored: coverage.scored,
      skipped: coverage.skipped,
      skippedAuth,
      skippedUnreachable,
      runnerErrors: runnerErrorCount,
      partial: partialCount,
      expectedToScore: coverage.expectedToScore,
      scoreRate: coverage.rate,
    },
    skippedByReason: {
      authWall,
      unreachable,
    },
    runnerErrors,
    ...(params.meta.runnerStability ? { runnerStability: params.meta.runnerStability } : {}),
    guidance: {
      authWall:
        "Route was not audited (login required). Configure signaler.config.json auth cookies/warmup or extend lab auth bypass in the app.",
      unreachable:
        "Route was not audited (server error or HTTP failure). Visit the URL in a browser and check the app server logs — Signaler does not capture stack traces.",
      runnerError:
        "Lighthouse failed for this combo. Re-run with --parallel 1 or inspect runtimeErrorMessage; visit the page for browser console errors.",
      partial:
        "Lighthouse reported a runtime error but partial audit data exists. Treat issue counts as incomplete; prefer re-run or manual verification.",
    },
  };
}

export function isAuditCoverageV1(value: unknown): value is AuditCoverageV1 {
  if (typeof value !== "object" || value === null) {
    return false;
  }
  const record = value as Record<string, unknown>;
  return record.schemaVersion === 1 && typeof record.totals === "object" && record.totals !== null;
}
