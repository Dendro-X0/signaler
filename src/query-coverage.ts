import type { AuditCoverageV1 } from "./audit-coverage.js";

export type CoverageProjection = {
  readonly view: "coverage";
  readonly schemaVersion: 1;
  readonly totals: AuditCoverageV1["totals"];
  readonly guidance: AuditCoverageV1["guidance"];
  readonly skippedByReason: {
    readonly authWall: readonly AuditCoverageV1["skippedByReason"]["authWall"][number][];
    readonly unreachable: readonly AuditCoverageV1["skippedByReason"]["unreachable"][number][];
  };
  readonly runnerErrors: readonly AuditCoverageV1["runnerErrors"][number][];
  readonly runnerStability?: AuditCoverageV1["runnerStability"];
  readonly artifacts: {
    readonly canonical: "coverage.json";
    readonly performanceTriage: "performance-triage.json";
  };
};

export function buildCoverageProjection(params: {
  readonly coverage: AuditCoverageV1;
  readonly top?: number;
}): CoverageProjection {
  const top = params.top ?? 100;
  return {
    view: "coverage",
    schemaVersion: 1,
    totals: params.coverage.totals,
    guidance: params.coverage.guidance,
    skippedByReason: {
      authWall: params.coverage.skippedByReason.authWall.slice(0, top),
      unreachable: params.coverage.skippedByReason.unreachable.slice(0, top),
    },
    runnerErrors: params.coverage.runnerErrors.slice(0, top),
    ...(params.coverage.runnerStability ? { runnerStability: params.coverage.runnerStability } : {}),
    artifacts: {
      canonical: "coverage.json",
      performanceTriage: "performance-triage.json",
    },
  };
}
