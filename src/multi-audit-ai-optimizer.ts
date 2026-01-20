import type { AuditType, Issue, IssueSeverity } from "./core/plugin-interface.js";

type MultiAuditAiIssueSummary = {
  readonly id: string;
  readonly title: string;
  readonly severity: IssueSeverity;
  readonly impact: number;
  readonly occurrences: number;
};

type MultiAuditAiAuditTypeSection = {
  readonly type: AuditType;
  readonly totals: {
    readonly issueCount: number;
    readonly bySeverity: Readonly<Record<IssueSeverity, number>>;
  };
  readonly topIssues: readonly MultiAuditAiIssueSummary[];
};

type MultiAuditAiCrossCuttingIssue = {
  readonly id: string;
  readonly title: string;
  readonly types: readonly AuditType[];
  readonly severity: IssueSeverity;
  readonly impact: number;
};

type MultiAuditAiAnalysisReport = {
  readonly meta: {
    readonly enabledAuditTypes: readonly AuditType[];
    readonly disclaimer: string;
    readonly tokenOptimized: boolean;
    readonly version: string;
  };
  readonly sections: readonly MultiAuditAiAuditTypeSection[];
  readonly crossAudit: {
    readonly crossCuttingIssues: readonly MultiAuditAiCrossCuttingIssue[];
  };
};

const MAX_TOP_ISSUES_PER_TYPE: number = 5;
const MAX_CROSS_CUTTING: number = 10;
const SEVERITY_ORDER: Readonly<Record<IssueSeverity, number>> = {
  critical: 4,
  high: 3,
  medium: 2,
  low: 1,
} as const;

function maxSeverity(params: { readonly severities: readonly IssueSeverity[] }): IssueSeverity {
  const { severities } = params;
  let best: IssueSeverity = "low";
  for (const severity of severities) {
    if (SEVERITY_ORDER[severity] > SEVERITY_ORDER[best]) {
      best = severity;
    }
  }
  return best;
}

function buildSeverityCounts(params: { readonly issues: readonly Issue[] }): Readonly<Record<IssueSeverity, number>> {
  const { issues } = params;
  const counts: Record<IssueSeverity, number> = {
    critical: 0,
    high: 0,
    medium: 0,
    low: 0,
  };
  for (const issue of issues) {
    counts[issue.severity] = counts[issue.severity] + 1;
  }
  return counts;
}

function sortByPriority(a: MultiAuditAiIssueSummary, b: MultiAuditAiIssueSummary): number {
  const severityDelta: number = SEVERITY_ORDER[b.severity] - SEVERITY_ORDER[a.severity];
  if (severityDelta !== 0) {
    return severityDelta;
  }
  if (b.impact !== a.impact) {
    return b.impact - a.impact;
  }
  return a.id.localeCompare(b.id);
}

/**
 * Multi-audit AI optimizer.
 * Generates a token-efficient unified AI analysis report with audit-type sections and cross-audit correlations.
 */
export class MultiAuditAiOptimizer {
  public buildReport(params: { readonly issues: readonly Issue[] }): MultiAuditAiAnalysisReport {
    const { issues } = params;
    const enabledAuditTypes: readonly AuditType[] = [...new Set(issues.map((i: Issue) => i.type))].sort(
      (a: AuditType, b: AuditType) => a.localeCompare(b),
    );
    const sections: readonly MultiAuditAiAuditTypeSection[] = enabledAuditTypes.map((type: AuditType) => {
      const typeIssues: readonly Issue[] = issues.filter((i: Issue) => i.type === type);
      const summariesById: Map<string, MultiAuditAiIssueSummary> = new Map();
      for (const issue of typeIssues) {
        const existing: MultiAuditAiIssueSummary | undefined = summariesById.get(issue.id);
        if (!existing) {
          summariesById.set(issue.id, {
            id: issue.id,
            title: issue.title,
            severity: issue.severity,
            impact: issue.impact,
            occurrences: 1,
          });
        } else {
          const severity: IssueSeverity = maxSeverity({ severities: [existing.severity, issue.severity] });
          const impact: number = Math.max(existing.impact, issue.impact);
          summariesById.set(issue.id, {
            ...existing,
            severity,
            impact,
            occurrences: existing.occurrences + 1,
          });
        }
      }
      const topIssues: readonly MultiAuditAiIssueSummary[] = [...summariesById.values()].sort(sortByPriority).slice(0, MAX_TOP_ISSUES_PER_TYPE);
      return {
        type,
        totals: {
          issueCount: typeIssues.length,
          bySeverity: buildSeverityCounts({ issues: typeIssues }),
        },
        topIssues,
      };
    });
    const groupedAcrossTypes: Map<string, readonly Issue[]> = new Map();
    for (const issue of issues) {
      const existing: readonly Issue[] | undefined = groupedAcrossTypes.get(issue.id);
      groupedAcrossTypes.set(issue.id, typeof existing === "undefined" ? [issue] : [...existing, issue]);
    }
    const crossCuttingIssues: readonly MultiAuditAiCrossCuttingIssue[] = [...groupedAcrossTypes.entries()]
      .map(([id, entries]: [string, readonly Issue[]]): MultiAuditAiCrossCuttingIssue | undefined => {
        const types: readonly AuditType[] = [...new Set(entries.map((e: Issue) => e.type))];
        if (types.length < 2) {
          return undefined;
        }
        const severity: IssueSeverity = maxSeverity({ severities: entries.map((e: Issue) => e.severity) });
        const impact: number = Math.max(...entries.map((e: Issue) => e.impact));
        return {
          id,
          title: entries[0].title,
          types: types.sort((a: AuditType, b: AuditType) => a.localeCompare(b)),
          severity,
          impact,
        };
      })
      .filter((x: MultiAuditAiCrossCuttingIssue | undefined): x is MultiAuditAiCrossCuttingIssue => typeof x !== "undefined")
      .sort((a: MultiAuditAiCrossCuttingIssue, b: MultiAuditAiCrossCuttingIssue) => {
        const severityDelta: number = SEVERITY_ORDER[b.severity] - SEVERITY_ORDER[a.severity];
        if (severityDelta !== 0) {
          return severityDelta;
        }
        if (b.impact !== a.impact) {
          return b.impact - a.impact;
        }
        return a.id.localeCompare(b.id);
      })
      .slice(0, MAX_CROSS_CUTTING);
    return {
      meta: {
        enabledAuditTypes,
        disclaimer: "Token-efficient multi-audit report. Some sections are truncated to reduce redundancy.",
        tokenOptimized: true,
        version: "1.0.0",
      },
      sections,
      crossAudit: {
        crossCuttingIssues,
      },
    };
  }

  public buildReportJson(params: { readonly issues: readonly Issue[] }): string {
    const report: MultiAuditAiAnalysisReport = this.buildReport(params);
    return JSON.stringify(report);
  }
}
