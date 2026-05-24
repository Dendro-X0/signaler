export type DiscoveryExcludedReasons = {
  readonly scope: number;
  readonly filter: number;
  readonly dynamic: number;
};

export type DiscoveryCoverage = {
  readonly auditedCoveragePct: number;
  readonly excludedReasons: DiscoveryExcludedReasons;
  readonly recommendFullScope: boolean;
};

export function buildDiscoveryCoverage(params: {
  readonly detected: number;
  readonly selected: number;
  readonly excludedDynamic: number;
  readonly excludedByFilter: number;
  readonly excludedByScope: number;
  readonly scopeResolved: "quick" | "full" | "file" | "interactive";
}): DiscoveryCoverage {
  const excludedReasons: DiscoveryExcludedReasons = {
    scope: Math.max(0, params.excludedByScope),
    filter: Math.max(0, params.excludedByFilter),
    dynamic: Math.max(0, params.excludedDynamic),
  };
  const auditedCoveragePct: number =
    params.detected > 0 ? Math.round((params.selected / params.detected) * 100) : 100;
  const recommendFullScope: boolean =
    params.scopeResolved === "quick" && params.detected >= 20 && auditedCoveragePct < 50;
  return {
    auditedCoveragePct,
    excludedReasons,
    recommendFullScope,
  };
}

export function formatDiscoveryCoverageLine(params: {
  readonly detected: number;
  readonly selected: number;
  readonly coverage: DiscoveryCoverage;
}): string {
  return `auditing ${params.selected}/${params.detected} routes (${params.coverage.auditedCoveragePct}%)`;
}
