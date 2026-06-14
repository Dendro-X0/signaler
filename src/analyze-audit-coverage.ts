import type { AuditCoverageV1, CoverageRunnerErrorEntry, CoverageSkipEntry } from "./audit-coverage.js";
import type { AnalyzeCandidateDraft } from "./analyze-performance-triage.js";

function groupSkipsByPath(entries: readonly CoverageSkipEntry[]): Map<string, CoverageSkipEntry[]> {
  const byPath = new Map<string, CoverageSkipEntry[]>();
  for (const entry of entries) {
    const list = byPath.get(entry.path) ?? [];
    list.push(entry);
    byPath.set(entry.path, list);
  }
  return byPath;
}

function draftFromSkipGroup(params: {
  readonly kind: "auth-wall" | "unreachable";
  readonly path: string;
  readonly entries: readonly CoverageSkipEntry[];
  readonly guidance: string;
}): AnalyzeCandidateDraft {
  const affectedCombos = params.entries.map((entry) => ({
    label: entry.label,
    path: entry.path,
    device: entry.device as "mobile" | "desktop",
  }));
  const reason = params.entries[0]?.reason ?? params.path;
  const title =
    params.kind === "auth-wall"
      ? `Route not audited (auth required): ${params.path}`
      : `Route not audited (unreachable): ${params.path}`;
  return {
    sourceSuggestionId: `coverage-${params.kind}-${params.path}`,
    title,
    category: "reliability",
    confidence: "high",
    estimatedImpact: {
      affectedCombos: affectedCombos.length,
    },
    affectedCombos,
    baseEvidence: [
      {
        sourceRelPath: "coverage.json",
        pointer: params.entries[0]?.pointer ?? `coverage.json#/skippedByReason/${params.kind === "auth-wall" ? "authWall" : "unreachable"}/0`,
        artifactRelPath: "coverage.json",
      },
    ],
    action: {
      summary: reason,
      steps: [
        params.guidance,
        "Re-run signaler audit after the route is reachable in the lab environment.",
        "Confirm with signaler query --view coverage --dir .signaler",
      ],
      effort: params.kind === "auth-wall" ? "medium" : "high",
    },
    verifyPlan: {
      recommendedMode: "throughput",
      targetRoutes: [params.path],
      expectedDirection: {},
    },
    basePriority: params.kind === "auth-wall" ? 2500 : 3200,
    externalBoost: { totalBoost: 0, evidence: [] },
  };
}

function draftFromRunnerError(entry: CoverageRunnerErrorEntry, guidance: string): AnalyzeCandidateDraft {
  return {
    sourceSuggestionId: `coverage-runner-${entry.path}-${entry.device}`,
    title: `Lighthouse runtime error: ${entry.path} [${entry.device}]`,
    category: "reliability",
    confidence: entry.auditStatus === "partial" ? "medium" : "high",
    estimatedImpact: {
      affectedCombos: 1,
    },
    affectedCombos: [{ label: entry.label, path: entry.path, device: entry.device as "mobile" | "desktop" }],
    baseEvidence: [
      {
        sourceRelPath: "coverage.json",
        pointer: entry.pointer,
        artifactRelPath: "coverage.json",
      },
    ],
    action: {
      summary: entry.runtimeErrorMessage.slice(0, 200),
      steps: [
        guidance,
        "Visit the URL in a browser for console/server errors if needed.",
        "Retry with signaler run --parallel 1 for flaky Lighthouse traces.",
      ],
      effort: "medium",
    },
    verifyPlan: {
      recommendedMode: "throughput",
      targetRoutes: [entry.path],
      expectedDirection: entry.auditStatus === "partial" ? { issueCount: "down" } : {},
    },
    basePriority: entry.auditStatus === "partial" ? 2800 : 3400,
    externalBoost: { totalBoost: 0, evidence: [] },
  };
}

export function buildCandidateDraftsFromAuditCoverage(params: {
  readonly coverage: AuditCoverageV1;
}): readonly AnalyzeCandidateDraft[] {
  const drafts: AnalyzeCandidateDraft[] = [];

  for (const [path, entries] of groupSkipsByPath(params.coverage.skippedByReason.authWall)) {
    drafts.push(
      draftFromSkipGroup({
        kind: "auth-wall",
        path,
        entries,
        guidance: params.coverage.guidance.authWall,
      }),
    );
  }

  for (const [path, entries] of groupSkipsByPath(params.coverage.skippedByReason.unreachable)) {
    drafts.push(
      draftFromSkipGroup({
        kind: "unreachable",
        path,
        entries,
        guidance: params.coverage.guidance.unreachable,
      }),
    );
  }

  for (const entry of params.coverage.runnerErrors) {
    drafts.push(
      draftFromRunnerError(
        entry,
        entry.auditStatus === "partial" ? params.coverage.guidance.partial : params.coverage.guidance.runnerError,
      ),
    );
  }

  return drafts.sort((a, b) => b.basePriority - a.basePriority);
}
