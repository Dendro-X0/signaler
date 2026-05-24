import type {
  AnalyzeActionV6,
  AnalyzeConfidenceV6,
  PerformanceTriageIssueV3,
  PerformanceTriageV3,
  ResultsV3Line,
} from "./engine-contracts/artifacts/index.js";
import { extractIssueIdFromSuggestionId } from "./external-signals.js";

export type AnalyzeCandidateDraft = {
  readonly sourceSuggestionId: string;
  readonly title: string;
  readonly category: AnalyzeActionV6["category"];
  readonly confidence: AnalyzeConfidenceV6;
  readonly estimatedImpact: AnalyzeActionV6["estimatedImpact"];
  readonly affectedCombos: AnalyzeActionV6["affectedCombos"];
  readonly baseEvidence: AnalyzeActionV6["evidence"];
  readonly action: AnalyzeActionV6["action"];
  readonly verifyPlan: AnalyzeActionV6["verifyPlan"];
  readonly basePriority: number;
  readonly externalBoost: {
    readonly totalBoost: number;
    readonly evidence: readonly AnalyzeActionV6["evidence"][number][];
  };
  readonly benchmarkQuery?: {
    readonly candidateId: string;
    readonly issueId: string;
    readonly allowedPaths?: readonly string[];
  };
  readonly fromPerformanceTriage?: boolean;
};

function normalizeText(value: string): string {
  return value.trim().toLowerCase().replace(/\s+/g, " ");
}

function confidenceFromSeverity(severity: "red" | "yellow"): AnalyzeConfidenceV6 {
  return severity === "red" ? "high" : "medium";
}

function confidenceWeight(value: AnalyzeConfidenceV6): number {
  if (value === "high") return 1.0;
  if (value === "medium") return 0.7;
  return 0.4;
}

function compareComboSeverity(a: ResultsV3Line, b: ResultsV3Line): number {
  const score = (line: ResultsV3Line): number => {
    if (typeof line.runtimeErrorMessage === "string" && line.runtimeErrorMessage.length > 0) return -1;
    if (typeof line.scores.performance === "number") return line.scores.performance;
    return 101;
  };
  const scoreDelta: number = score(a) - score(b);
  if (scoreDelta !== 0) return scoreDelta;
  return a.path.localeCompare(b.path) || a.device.localeCompare(b.device) || a.label.localeCompare(b.label);
}

export function pickAffectedCombosForIssue(params: {
  readonly issueId: string;
  readonly title: string;
  readonly results: readonly ResultsV3Line[];
  readonly maxCombos?: number;
}): readonly AnalyzeActionV6["affectedCombos"][number][] {
  const titleNorm: string = normalizeText(params.title);
  const matches: ResultsV3Line[] = [];
  for (const result of params.results) {
    const hasMatch: boolean =
      result.opportunities.some((o) => o.id === params.issueId)
      || result.failedAudits.some((a) => a.id === params.issueId)
      || result.opportunities.some((o) => normalizeText(o.title) === titleNorm);
    if (hasMatch) {
      matches.push(result);
    }
  }
  const sorted = [...matches].sort(compareComboSeverity);
  const cap = params.maxCombos ?? 10;
  return sorted.slice(0, cap).map((row) => ({
    label: row.label,
    path: row.path,
    device: row.device,
  }));
}

export function buildExpectedDirectionForPerformanceIssue(params: {
  readonly combos: readonly ResultsV3Line[];
  readonly issue: PerformanceTriageIssueV3;
  readonly useIssueCountPrimary: boolean;
}): AnalyzeActionV6["verifyPlan"]["expectedDirection"] {
  if (params.useIssueCountPrimary) {
    return {
      issueCount: "down",
      ...(typeof params.issue.totalEstimatedSavingsBytes === "number" && params.issue.totalEstimatedSavingsBytes > 0
        ? { bytes: "down" as const }
        : {}),
      ...(params.combos.some((combo) => typeof combo.metrics.lcpMs === "number") ? { lcpMs: "down" as const } : {}),
      ...(params.combos.some((combo) => typeof combo.metrics.tbtMs === "number") ? { tbtMs: "down" as const } : {}),
    };
  }
  return {
    score: "up",
    ...(params.combos.some((combo) => typeof combo.metrics.lcpMs === "number") ? { lcpMs: "down" as const } : {}),
    ...(params.combos.some((combo) => typeof combo.metrics.tbtMs === "number") ? { tbtMs: "down" as const } : {}),
    ...(typeof params.issue.totalEstimatedSavingsBytes === "number" && params.issue.totalEstimatedSavingsBytes > 0
      ? { bytes: "down" as const }
      : {}),
  };
}

export function buildCandidateDraftsFromPerformanceTriage(params: {
  readonly triage: PerformanceTriageV3;
  readonly results: readonly ResultsV3Line[];
}): AnalyzeCandidateDraft[] {
  const drafts: AnalyzeCandidateDraft[] = [];
  for (const issue of params.triage.uniqueIssues) {
    const affectedCombos = pickAffectedCombosForIssue({
      issueId: issue.id,
      title: issue.title,
      results: params.results,
    });
    const comboMap: Map<string, ResultsV3Line> = new Map(
      params.results.map((row) => [`${row.label}|${row.path}|${row.device}`, row] as const),
    );
    const matchedRows: ResultsV3Line[] = affectedCombos
      .map((combo) => comboMap.get(`${combo.label}|${combo.path}|${combo.device}`))
      .filter((row): row is ResultsV3Line => row !== undefined);
    const confidence = confidenceFromSeverity(issue.severity);
    const timeMs = issue.totalEstimatedSavingsMs ?? 0;
    const bytes = issue.totalEstimatedSavingsBytes ?? 0;
    const basePriority: number = Math.round(
      timeMs + bytes / 1024 + issue.affectedCombos * 80 + (issue.severity === "red" ? 400 : 120),
    );
    const routes = [...new Set(affectedCombos.map((combo) => combo.path))].slice(0, 10);
    drafts.push({
      sourceSuggestionId: `triage-${issue.id}`,
      title: issue.title,
      category: "performance",
      confidence,
      estimatedImpact: {
        ...(timeMs > 0 ? { timeMs } : {}),
        ...(bytes > 0 ? { bytes } : {}),
        affectedCombos: Math.max(1, issue.affectedCombos),
      },
      affectedCombos: affectedCombos.length > 0 ? affectedCombos : [{ label: "unknown", path: "/", device: "mobile" }],
      baseEvidence: [
        {
          sourceRelPath: "performance-triage.json",
          pointer: issue.pointer,
          artifactRelPath: "performance-triage.json",
        },
      ],
      action: {
        summary: `Address Lighthouse ${issue.kind} "${issue.title}" (${issue.severity}).`,
        steps: [
          "Run signaler explain --id " + issue.id,
          "Apply the smallest fix that removes this issue from affected routes.",
          "Re-run signaler verify --contract v6 and signaler query --view delta.",
        ],
        effort: issue.severity === "red" ? "medium" : "low",
      },
      verifyPlan: {
        recommendedMode: "fidelity",
        targetRoutes: routes.length > 0 ? routes : ["/"],
        expectedDirection: buildExpectedDirectionForPerformanceIssue({
          combos: matchedRows,
          issue,
          useIssueCountPrimary: true,
        }),
      },
      basePriority,
      externalBoost: { totalBoost: 0, evidence: [] },
      benchmarkQuery: {
        candidateId: `triage-${issue.id}`,
        issueId: issue.id,
        ...(routes.length > 0 ? { allowedPaths: routes } : {}),
      },
      fromPerformanceTriage: true,
    });
  }
  return drafts;
}

function triageIssueId(draft: AnalyzeCandidateDraft): string | undefined {
  if (draft.fromPerformanceTriage !== true) {
    return undefined;
  }
  return draft.sourceSuggestionId.replace(/^triage-/, "");
}

function mergeKeyForSuggestionDraft(draft: AnalyzeCandidateDraft): string {
  return `suggestion:${draft.sourceSuggestionId}`;
}

export function mergeAnalyzeCandidateDrafts(params: {
  readonly suggestionDrafts: readonly AnalyzeCandidateDraft[];
  readonly triageDrafts: readonly AnalyzeCandidateDraft[];
}): readonly AnalyzeCandidateDraft[] {
  const merged: Map<string, AnalyzeCandidateDraft> = new Map();
  const triageByIssueId: Map<string, AnalyzeCandidateDraft> = new Map();

  for (const draft of params.triageDrafts) {
    const issueId = triageIssueId(draft);
    if (issueId !== undefined) {
      triageByIssueId.set(issueId, draft);
    }
    merged.set(`triage:${issueId ?? draft.sourceSuggestionId}`, draft);
  }

  for (const draft of params.suggestionDrafts) {
    const issueId = extractIssueIdFromSuggestionId(draft.sourceSuggestionId);
    const triageMatch = issueId !== undefined ? triageByIssueId.get(issueId) : undefined;
    const key = triageMatch !== undefined ? `triage:${issueId}` : mergeKeyForSuggestionDraft(draft);
    const existing = triageMatch ?? merged.get(key);
    if (existing === undefined) {
      merged.set(key, draft);
      continue;
    }
    const boostedPriority: number = Math.round(
      Math.max(existing.basePriority, draft.basePriority) * 1.2 + (existing.fromPerformanceTriage ? 100 : 0),
    );
    const evidence = [...existing.baseEvidence, ...draft.baseEvidence].slice(0, 6);
    merged.set(key, {
      ...existing,
      basePriority: boostedPriority,
      confidence:
        confidenceWeight(existing.confidence) >= confidenceWeight(draft.confidence)
          ? existing.confidence
          : draft.confidence,
      baseEvidence: evidence,
      estimatedImpact: {
        ...(Math.max(existing.estimatedImpact.timeMs ?? 0, draft.estimatedImpact.timeMs ?? 0) > 0
          ? { timeMs: Math.max(existing.estimatedImpact.timeMs ?? 0, draft.estimatedImpact.timeMs ?? 0) }
          : {}),
        ...(Math.max(existing.estimatedImpact.bytes ?? 0, draft.estimatedImpact.bytes ?? 0) > 0
          ? { bytes: Math.max(existing.estimatedImpact.bytes ?? 0, draft.estimatedImpact.bytes ?? 0) }
          : {}),
        affectedCombos: Math.max(existing.estimatedImpact.affectedCombos, draft.estimatedImpact.affectedCombos),
      },
      fromPerformanceTriage: existing.fromPerformanceTriage === true || draft.fromPerformanceTriage === true,
    });
  }

  return [...merged.values()].sort((a, b) => {
    if (b.basePriority !== a.basePriority) return b.basePriority - a.basePriority;
    return a.title.localeCompare(b.title);
  });
}
