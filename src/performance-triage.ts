import type { PageDeviceSummary } from "./core/types.js";
import type {
  PerformanceIssueKind,
  PerformanceIssueSeverity,
  PerformanceTriageIssueV3,
  PerformanceTriageV3,
  ResultsV3Line,
  RunProtocolV3,
} from "./engine-contracts/artifacts/v3/index.js";
import type { MachineArtifactProfile } from "./machine-output-profile.js";

const PERFORMANCE_SCORE_DISCLAIMER =
  "Performance category scores are lab-oriented and may differ from DevTools one-off runs under parallel load. Prefer issue-count triage (red/yellow) and verify deltas after fixes.";

const CATEGORY_SCORE_NOTE =
  "Accessibility, SEO, and best-practices scores are reported as 0–100 category scores and usually align closely with DevTools.";

type IssueAccumulator = {
  readonly id: string;
  readonly title: string;
  readonly severity: "red" | "yellow";
  readonly kind: PerformanceIssueKind;
  affectedCombos: number;
  totalEstimatedSavingsMs: number;
  totalEstimatedSavingsBytes: number;
};

export function classifyAuditSeverity(params: {
  readonly score: number;
  readonly scoreDisplayMode: string;
}): PerformanceIssueSeverity | null {
  const mode: string = params.scoreDisplayMode;
  if (mode === "manual" || mode === "informative" || mode === "notApplicable") {
    return null;
  }
  if (params.score >= 0.9) {
    return "green";
  }
  if (params.score >= 0.5) {
    return "yellow";
  }
  return "red";
}

export function classifyOpportunitySeverity(params: {
  readonly estimatedSavingsMs?: number;
  readonly estimatedSavingsBytes?: number;
}): PerformanceIssueSeverity | null {
  const ms: number = params.estimatedSavingsMs ?? 0;
  const bytes: number = params.estimatedSavingsBytes ?? 0;
  if (ms <= 0 && bytes <= 0) {
    return null;
  }
  if (ms >= 500 || bytes >= 100_000) {
    return "red";
  }
  return "yellow";
}

function medianRounded(values: readonly number[]): number | undefined {
  const sorted: number[] = values.filter((v) => Number.isFinite(v)).sort((a, b) => a - b);
  if (sorted.length === 0) {
    return undefined;
  }
  const mid: number = Math.floor(sorted.length / 2);
  if (sorted.length % 2 === 1) {
    return Math.round(sorted[mid] ?? 0);
  }
  return Math.round(((sorted[mid - 1] ?? 0) + (sorted[mid] ?? 0)) / 2);
}

function getProfileCaps(profile: MachineArtifactProfile): { readonly maxOpportunities: number; readonly maxFailedAudits: number } {
  if (profile === "diagnostics") {
    return { maxOpportunities: 25, maxFailedAudits: 40 };
  }
  if (profile === "standard") {
    return { maxOpportunities: 10, maxFailedAudits: 20 };
  }
  return { maxOpportunities: 5, maxFailedAudits: 12 };
}

export function trimResultsLineForMachineProfile(params: {
  readonly line: ResultsV3Line;
  readonly artifactProfile: MachineArtifactProfile;
  readonly perfIncludeYellow: boolean;
}): ResultsV3Line {
  const caps = getProfileCaps(params.artifactProfile);
  const opportunities = params.line.opportunities
    .filter((o) => (o.estimatedSavingsMs ?? 0) > 0 || (o.estimatedSavingsBytes ?? 0) > 0)
    .slice(0, caps.maxOpportunities);
  const failedAudits = params.line.failedAudits
    .filter((audit) => {
      const severity = classifyAuditSeverity({ score: audit.score, scoreDisplayMode: audit.scoreDisplayMode });
      if (severity === null || severity === "green") {
        return false;
      }
      if (!params.perfIncludeYellow && severity === "yellow") {
        return false;
      }
      return true;
    })
    .slice(0, caps.maxFailedAudits);
  return {
    ...params.line,
    opportunities,
    failedAudits,
  };
}

export function buildPerformanceTriageV3(params: {
  readonly results: readonly PageDeviceSummary[];
  readonly protocol: RunProtocolV3;
  readonly includeYellow: boolean;
}): PerformanceTriageV3 {
  const issueMap: Map<string, IssueAccumulator> = new Map();
  let red = 0;
  let yellow = 0;
  let green = 0;

  for (const combo of params.results) {
    const seenInCombo: Set<string> = new Set();
    for (const audit of combo.failedAudits) {
      const severity = classifyAuditSeverity({ score: audit.score, scoreDisplayMode: audit.scoreDisplayMode });
      if (severity === null) {
        continue;
      }
      if (severity === "green") {
        green += 1;
        continue;
      }
      if (!params.includeYellow && severity === "yellow") {
        continue;
      }
      if (severity === "red") {
        red += 1;
      } else {
        yellow += 1;
      }
      const actionableSeverity: "red" | "yellow" = severity === "red" ? "red" : "yellow";
      const key = `audit:${audit.id}`;
      if (!seenInCombo.has(key)) {
        seenInCombo.add(key);
        const existing = issueMap.get(key);
        if (existing === undefined) {
          issueMap.set(key, {
            id: audit.id,
            title: audit.title,
            severity: actionableSeverity,
            kind: "audit",
            affectedCombos: 1,
            totalEstimatedSavingsMs: 0,
            totalEstimatedSavingsBytes: 0,
          });
        } else {
          issueMap.set(key, {
            ...existing,
            affectedCombos: existing.affectedCombos + 1,
            severity: existing.severity === "red" || severity === "red" ? "red" : "yellow",
          });
        }
      }
    }
    for (const opportunity of combo.opportunities) {
      const severity = classifyOpportunitySeverity({
        estimatedSavingsMs: opportunity.estimatedSavingsMs,
        estimatedSavingsBytes: opportunity.estimatedSavingsBytes,
      });
      if (severity === null) {
        continue;
      }
      if (!params.includeYellow && severity === "yellow") {
        continue;
      }
      if (severity === "red") {
        red += 1;
      } else {
        yellow += 1;
      }
      const actionableSeverity: "red" | "yellow" = severity === "red" ? "red" : "yellow";
      const key = `opportunity:${opportunity.id}`;
      if (!seenInCombo.has(key)) {
        seenInCombo.add(key);
        const existing = issueMap.get(key);
        const ms = opportunity.estimatedSavingsMs ?? 0;
        const bytes = opportunity.estimatedSavingsBytes ?? 0;
        if (existing === undefined) {
          issueMap.set(key, {
            id: opportunity.id,
            title: opportunity.title,
            severity: actionableSeverity,
            kind: "opportunity",
            affectedCombos: 1,
            totalEstimatedSavingsMs: ms,
            totalEstimatedSavingsBytes: bytes,
          });
        } else {
          issueMap.set(key, {
            ...existing,
            affectedCombos: existing.affectedCombos + 1,
            totalEstimatedSavingsMs: existing.totalEstimatedSavingsMs + ms,
            totalEstimatedSavingsBytes: existing.totalEstimatedSavingsBytes + bytes,
            severity: existing.severity === "red" || severity === "red" ? "red" : "yellow",
          });
        }
      }
    }
  }

  const uniqueIssues: PerformanceTriageIssueV3[] = [...issueMap.values()]
    .sort((a, b) => {
      if (a.severity !== b.severity) {
        return a.severity === "red" ? -1 : 1;
      }
      const impactA = a.totalEstimatedSavingsMs + a.totalEstimatedSavingsBytes / 1024;
      const impactB = b.totalEstimatedSavingsMs + b.totalEstimatedSavingsBytes / 1024;
      if (impactB !== impactA) {
        return impactB - impactA;
      }
      if (b.affectedCombos !== a.affectedCombos) {
        return b.affectedCombos - a.affectedCombos;
      }
      return a.id.localeCompare(b.id);
    })
    .map((issue, index) => ({
      id: issue.id,
      title: issue.title,
      severity: issue.severity,
      kind: issue.kind,
      affectedCombos: issue.affectedCombos,
      ...(issue.totalEstimatedSavingsMs > 0 ? { totalEstimatedSavingsMs: issue.totalEstimatedSavingsMs } : {}),
      ...(issue.totalEstimatedSavingsBytes > 0 ? { totalEstimatedSavingsBytes: issue.totalEstimatedSavingsBytes } : {}),
      pointer: `performance-triage.json#/uniqueIssues/${index}`,
    }));

  return {
    generatedAt: new Date().toISOString(),
    contractVersion: "v3",
    reportingModel: "issue-count",
    comparabilityHash: params.protocol.comparabilityHash,
    mode: params.protocol.mode,
    options: {
      includeYellow: params.includeYellow,
    },
    disclaimer: PERFORMANCE_SCORE_DISCLAIMER,
    categoryScores: {
      accessibility: medianRounded(params.results.map((r) => r.scores.accessibility).filter((v): v is number => typeof v === "number")),
      bestPractices: medianRounded(params.results.map((r) => r.scores.bestPractices).filter((v): v is number => typeof v === "number")),
      seo: medianRounded(params.results.map((r) => r.scores.seo).filter((v): v is number => typeof v === "number")),
      note: CATEGORY_SCORE_NOTE,
    },
    totals: {
      red,
      yellow,
      green,
      actionable: red + yellow,
    },
    uniqueIssues,
  };
}

export function isPerformanceTriageV3(value: unknown): value is PerformanceTriageV3 {
  if (typeof value !== "object" || value === null) {
    return false;
  }
  const record = value as Record<string, unknown>;
  return record.contractVersion === "v3" && record.reportingModel === "issue-count" && Array.isArray(record.uniqueIssues);
}
