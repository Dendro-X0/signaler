import type { AnalyzeActionV6, AnalyzeCategoryV6, AnalyzeEvidenceV6 } from "./engine-contracts/artifacts/v6/analyze-v6.js";
import type { PerformanceTriageV3 } from "./engine-contracts/artifacts/v3/performance-triage-v3.js";
import type { ResultsV3Line } from "./engine-contracts/artifacts/v3/results-v3.js";
import type { AuditCoverageV1 } from "./audit-coverage.js";

export type FixQueueTargetV1 = {
  readonly path: string;
  readonly label: string;
  readonly device: string;
  readonly url?: string;
  readonly issueIds?: readonly string[];
  readonly estimatedSavingsMs?: number;
  readonly estimatedSavingsBytes?: number;
  readonly auditStatus?: string;
  readonly runtimeErrorMessage?: string;
  readonly pointer?: string;
};

export type FixQueueItemSourceV1 =
  | {
    readonly kind: "lighthouse-triage";
    readonly issueId: string;
    readonly lighthouseKind?: "audit" | "opportunity";
  }
  | {
    readonly kind: "lighthouse-suggestion";
    readonly suggestionId: string;
  }
  | {
    readonly kind: "route-coverage";
    readonly skipKind: "auth-wall" | "unreachable" | "runner-error" | "partial";
  };

export type FixQueueItemV1 = {
  readonly rank: number;
  readonly actionId: string;
  readonly category: AnalyzeCategoryV6;
  readonly title: string;
  readonly priorityScore: number;
  readonly confidence: AnalyzeActionV6["confidence"];
  readonly source: FixQueueItemSourceV1;
  readonly targets: readonly FixQueueTargetV1[];
  readonly evidence: readonly AnalyzeEvidenceV6[];
  readonly steps: readonly string[];
  readonly verify: AnalyzeActionV6["verifyPlan"];
  readonly explainCommand: string;
};

export type FixQueueV1 = {
  readonly schemaVersion: 1;
  readonly generatedAt: string;
  readonly comparabilityHash: string;
  readonly primaryArtifact: "fix-queue.json";
  readonly fixLoop: {
    readonly auditIncremental: string;
    readonly verify: string;
    readonly delta: string;
    readonly coverage: string;
    readonly perf: string;
    readonly note: string;
  };
  readonly totals: {
    readonly items: number;
    readonly performance: number;
    readonly reliability: number;
    readonly accessibility: number;
    readonly seo: number;
    readonly bestPractices: number;
  };
  readonly items: readonly FixQueueItemV1[];
};

function extractTriageIssueId(sourceSuggestionId: string): string | undefined {
  if (!sourceSuggestionId.startsWith("triage-")) {
    return undefined;
  }
  const id = sourceSuggestionId.slice("triage-".length);
  return id.length > 0 ? id : undefined;
}

function resolveActionSource(action: AnalyzeActionV6): FixQueueItemSourceV1 {
  const suggestionId = action.sourceSuggestionId ?? action.id;
  if (suggestionId.startsWith("coverage-")) {
    if (suggestionId.includes("auth-wall")) {
      return { kind: "route-coverage", skipKind: "auth-wall" };
    }
    if (suggestionId.includes("unreachable")) {
      return { kind: "route-coverage", skipKind: "unreachable" };
    }
    if (suggestionId.includes("runner-")) {
      return { kind: "route-coverage", skipKind: "partial" };
    }
    return { kind: "route-coverage", skipKind: "runner-error" };
  }
  const issueId = extractTriageIssueId(suggestionId);
  if (issueId) {
    return { kind: "lighthouse-triage", issueId };
  }
  return { kind: "lighthouse-suggestion", suggestionId };
}

function urlForCombo(params: {
  readonly results: readonly ResultsV3Line[];
  readonly label: string;
  readonly path: string;
  readonly device: string;
}): string | undefined {
  const row = params.results.find(
    (entry) => entry.label === params.label && entry.path === params.path && entry.device === params.device,
  );
  return row?.url;
}

function enrichTargetsFromTriage(params: {
  readonly action: AnalyzeActionV6;
  readonly issueId: string;
  readonly triage: PerformanceTriageV3;
  readonly results: readonly ResultsV3Line[];
}): FixQueueTargetV1[] {
  return params.action.affectedCombos.map((combo) => {
    const triageCombo = params.triage.combos.find(
      (entry) => entry.label === combo.label && entry.path === combo.path && entry.device === combo.device,
    );
    const matchingIssues = (triageCombo?.issues ?? []).filter((issue) => issue.id === params.issueId);
    const issue = matchingIssues[0];
    const uniqueIssue = params.triage.uniqueIssues.find((entry) => entry.id === params.issueId);
    return {
      path: combo.path,
      label: combo.label,
      device: combo.device,
      url: triageCombo?.url ?? urlForCombo({ results: params.results, ...combo }),
      issueIds: matchingIssues.length > 0 ? matchingIssues.map((row) => row.id) : [params.issueId],
      ...(issue?.estimatedSavingsMs !== undefined ? { estimatedSavingsMs: issue.estimatedSavingsMs } : {}),
      ...(issue?.estimatedSavingsBytes !== undefined ? { estimatedSavingsBytes: issue.estimatedSavingsBytes } : {}),
      ...(triageCombo?.auditStatus ? { auditStatus: triageCombo.auditStatus } : {}),
      ...(triageCombo?.runtimeErrorMessage ? { runtimeErrorMessage: triageCombo.runtimeErrorMessage } : {}),
      pointer: triageCombo?.pointer ?? uniqueIssue?.pointer,
    };
  });
}

function enrichTargetsFromCoverage(params: {
  readonly action: AnalyzeActionV6;
  readonly coverage?: AuditCoverageV1;
}): FixQueueTargetV1[] {
  return params.action.affectedCombos.map((combo) => {
    const skipEntry =
      params.coverage?.skippedByReason.authWall.find(
        (entry) => entry.path === combo.path && entry.device === combo.device,
      )
      ?? params.coverage?.skippedByReason.unreachable.find(
        (entry) => entry.path === combo.path && entry.device === combo.device,
      );
    const runnerEntry = params.coverage?.runnerErrors.find(
      (entry) => entry.path === combo.path && entry.device === combo.device,
    );
    const entry = skipEntry ?? runnerEntry;
    return {
      path: combo.path,
      label: combo.label,
      device: combo.device,
      url: entry?.url,
      ...(entry && "reason" in entry ? { runtimeErrorMessage: entry.reason } : {}),
      ...(runnerEntry ? { runtimeErrorMessage: runnerEntry.runtimeErrorMessage, auditStatus: runnerEntry.auditStatus } : {}),
      pointer: entry?.pointer,
    };
  });
}

function defaultTargets(params: {
  readonly action: AnalyzeActionV6;
  readonly results: readonly ResultsV3Line[];
}): FixQueueTargetV1[] {
  return params.action.affectedCombos.map((combo) => ({
    path: combo.path,
    label: combo.label,
    device: combo.device,
    url: urlForCombo({ results: params.results, ...combo }),
  }));
}

function countByCategory(items: readonly FixQueueItemV1[]): FixQueueV1["totals"] {
  const totals = {
    items: items.length,
    performance: 0,
    reliability: 0,
    accessibility: 0,
    seo: 0,
    bestPractices: 0,
  };
  for (const item of items) {
    if (item.category === "performance") totals.performance += 1;
    else if (item.category === "reliability") totals.reliability += 1;
    else if (item.category === "accessibility") totals.accessibility += 1;
    else if (item.category === "seo") totals.seo += 1;
    else if (item.category === "best-practices") totals.bestPractices += 1;
  }
  return totals;
}

export function buildFixQueueV1(params: {
  readonly actions: readonly AnalyzeActionV6[];
  readonly comparabilityHash: string;
  readonly performanceTriage?: PerformanceTriageV3;
  readonly results: readonly ResultsV3Line[];
  readonly coverage?: AuditCoverageV1;
}): FixQueueV1 {
  const items: FixQueueItemV1[] = params.actions.map((action, index) => {
    const baseSource = resolveActionSource(action);
    let targets: FixQueueTargetV1[];
    let source: FixQueueItemSourceV1 = baseSource;
    if (baseSource.kind === "lighthouse-triage" && params.performanceTriage) {
      const unique = params.performanceTriage.uniqueIssues.find((issue) => issue.id === baseSource.issueId);
      source = unique
        ? { kind: "lighthouse-triage", issueId: baseSource.issueId, lighthouseKind: unique.kind }
        : baseSource;
      targets = enrichTargetsFromTriage({
        action,
        issueId: baseSource.issueId,
        triage: params.performanceTriage,
        results: params.results,
      });
    } else if (baseSource.kind === "route-coverage") {
      targets = enrichTargetsFromCoverage({ action, coverage: params.coverage });
    } else {
      targets = defaultTargets({ action, results: params.results });
    }
    return {
      rank: index + 1,
      actionId: action.id,
      category: action.category,
      title: action.title,
      priorityScore: action.priorityScore,
      confidence: action.confidence,
      source,
      targets,
      evidence: action.evidence,
      steps: action.action.steps,
      verify: action.verifyPlan,
      explainCommand: `signaler explain --id ${action.id} --dir .signaler --json`,
    };
  });

  return {
    schemaVersion: 1,
    generatedAt: new Date().toISOString(),
    comparabilityHash: params.comparabilityHash,
    primaryArtifact: "fix-queue.json",
    fixLoop: {
      auditIncremental: "signaler audit --incremental-skip --cwd . --base-url http://127.0.0.1:3000",
      verify: "signaler verify --contract v6 --dir .signaler",
      delta: "signaler query --view delta --dir .signaler --json",
      coverage: "signaler query --view coverage --dir .signaler --json",
      perf: "signaler query --view perf --dir .signaler --json",
      note: "After fixes: rerun audit with --incremental-skip to skip combos that already pass quality gates; use verify + delta to confirm issue-count reductions.",
    },
    totals: countByCategory(items),
    items,
  };
}

export function isFixQueueV1(value: unknown): value is FixQueueV1 {
  if (typeof value !== "object" || value === null) {
    return false;
  }
  const record = value as Record<string, unknown>;
  return record.schemaVersion === 1 && Array.isArray(record.items);
}
