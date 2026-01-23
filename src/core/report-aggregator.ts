import type { AuditType, Issue, IssueSeverity } from "./plugin-interface.js";

const SEVERITY_WEIGHTS: Readonly<Record<IssueSeverity, number>> = {
  critical: 4,
  high: 3,
  medium: 2,
  low: 1,
} as const;

type PrioritizedIssue = {
  readonly issue: Issue;
  readonly priorityScore: number;
};

type CrossCuttingIssue = {
  readonly id: string;
  readonly title: string;
  readonly types: readonly AuditType[];
  readonly severity: IssueSeverity;
  readonly impact: number;
};

type AggregateIssuesParams = {
  readonly issues: readonly Issue[];
};

type AggregateIssuesReturn = {
  readonly prioritized: readonly PrioritizedIssue[];
  readonly crossCutting: readonly CrossCuttingIssue[];
};

/**
 * Aggregates issues across audit types, providing prioritization and cross-cutting detection.
 */
export class ReportAggregator {
  public aggregateIssues(params: AggregateIssuesParams): AggregateIssuesReturn {
    const { issues } = params;
    // Filter out issues with no impact to prevent report noise (e.g. 0ms savings)
    const validIssues = issues.filter(issue => issue.impact > 0);
    const prioritized: readonly PrioritizedIssue[] = this.prioritizeIssues({ issues: validIssues });
    const crossCutting: readonly CrossCuttingIssue[] = this.identifyCrossCuttingIssues({ issues: validIssues });
    return { prioritized, crossCutting };
  }

  public prioritizeIssues(params: {
    readonly issues: readonly Issue[];
  }): readonly PrioritizedIssue[] {
    const { issues } = params;
    const scored: readonly PrioritizedIssue[] = issues.map((issue: Issue): PrioritizedIssue => {
      const priorityScore: number = this.calculatePriorityScore({ severity: issue.severity, impact: issue.impact });
      return { issue, priorityScore };
    });
    return [...scored].sort((a: PrioritizedIssue, b: PrioritizedIssue) => {
      if (b.priorityScore !== a.priorityScore) {
        return b.priorityScore - a.priorityScore;
      }
      return a.issue.id.localeCompare(b.issue.id);
    });
  }

  public identifyCrossCuttingIssues(params: {
    readonly issues: readonly Issue[];
  }): readonly CrossCuttingIssue[] {
    const { issues } = params;
    const grouped: Map<string, Issue[]> = new Map();
    for (const issue of issues) {
      const key: string = issue.id;
      const existing: Issue[] | undefined = grouped.get(key);
      if (existing) {
        existing.push(issue);
      } else {
        grouped.set(key, [issue]);
      }
    }
    const crossCutting: CrossCuttingIssue[] = [];
    for (const [id, entries] of grouped.entries()) {
      const types: readonly AuditType[] = [...new Set(entries.map((e: Issue) => e.type))];
      if (types.length < 2) {
        continue;
      }
      const representative: Issue = entries[0];
      const severity: IssueSeverity = this.maxSeverity(entries.map((e: Issue) => e.severity));
      const impact: number = Math.max(...entries.map((e: Issue) => e.impact));
      crossCutting.push({
        id,
        title: representative.title,
        types,
        severity,
        impact,
      });
    }
    return crossCutting.sort((a: CrossCuttingIssue, b: CrossCuttingIssue) => {
      const scoreA: number = this.calculatePriorityScore({ severity: a.severity, impact: a.impact });
      const scoreB: number = this.calculatePriorityScore({ severity: b.severity, impact: b.impact });
      if (scoreB !== scoreA) {
        return scoreB - scoreA;
      }
      return a.id.localeCompare(b.id);
    });
  }

  private calculatePriorityScore(params: { readonly severity: IssueSeverity; readonly impact: number }): number {
    const { severity, impact } = params;
    const severityWeight: number = SEVERITY_WEIGHTS[severity];
    return severityWeight * 1000 + impact;
  }

  private maxSeverity(severities: readonly IssueSeverity[]): IssueSeverity {
    let best: IssueSeverity = "low";
    for (const severity of severities) {
      if (SEVERITY_WEIGHTS[severity] > SEVERITY_WEIGHTS[best]) {
        best = severity;
      }
    }
    return best;
  }
}
