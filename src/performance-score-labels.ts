export type PerformanceScoreDisplayMode = "fidelity" | "throughput";

export type AgentIndexPerformanceScoreSemantics = {
  readonly performanceColumnLabel: "P(ref)" | "P";
  readonly scoreKind: "lab-reference" | "devtools-parity";
  readonly disclaimer: string;
  readonly trustNotes: readonly string[];
  readonly validationCommand?: string;
};

export function performanceColumnLabel(mode: PerformanceScoreDisplayMode): "P(ref)" | "P" {
  return mode === "throughput" ? "P(ref)" : "P";
}

export function performanceInlineLabel(mode: PerformanceScoreDisplayMode): string {
  return performanceColumnLabel(mode);
}

export function avgPerformanceSummaryLabel(mode: PerformanceScoreDisplayMode): string {
  return mode === "throughput" ? "Avg P(ref)" : "Avg P";
}

export function throughputStatsPerformanceNote(): string {
  return "P(ref) is a Signaler lab reference score, not a DevTools score. Prefer red/yellow buckets and run --mode fidelity for DevTools-like parity.";
}

export function buildTrustNoteLines(mode: PerformanceScoreDisplayMode): readonly string[] {
  if (mode === "throughput") {
    return [
      "P(ref) is for regression triage in Signaler — not a 1:1 DevTools Lighthouse score.",
      "DevTools manual runs often score higher (many pages reach 90–100).",
      "Use `run --mode fidelity` (or `--parity`) when you need DevTools-like validation.",
    ];
  }
  return [
    "Fidelity mode is reproducibility-first and intended for DevTools-like validation.",
    "Compare runs only when comparabilityHash matches.",
  ];
}

export function buildStatsPanelContentLines(params: {
  readonly mode: PerformanceScoreDisplayMode;
  readonly avgP: number;
  readonly avgA: number;
  readonly avgBP: number;
  readonly avgSEO: number;
  readonly green: number;
  readonly yellow: number;
  readonly red: number;
  readonly count: number;
}): readonly string[] {
  const avgLabel: string = avgPerformanceSummaryLabel(params.mode);
  const lines: string[] = [
    `Summary: ${avgLabel}:${params.avgP} A:${params.avgA} BP:${params.avgBP} SEO:${params.avgSEO}`,
    `Scores: ${params.green} green (90+) | ${params.yellow} yellow (50-89) | ${params.red} red (<50) of ${params.count} total`,
  ];
  if (params.mode === "throughput") {
    lines.push(throughputStatsPerformanceNote());
  }
  return lines;
}

export function shellRunStrategyTrustLine(mode: PerformanceScoreDisplayMode): string {
  return mode === "throughput"
    ? "trust: P(ref) is lab reference only; DevTools may score higher — use `run --mode fidelity` for parity checks"
    : "trust: fidelity is parity-oriented; compare only with matching comparabilityHash";
}

export function buildAgentIndexPerformanceScoreSemantics(
  mode: PerformanceScoreDisplayMode,
): AgentIndexPerformanceScoreSemantics {
  if (mode === "throughput") {
    return {
      performanceColumnLabel: "P(ref)",
      scoreKind: "lab-reference",
      disclaimer: throughputStatsPerformanceNote(),
      trustNotes: buildTrustNoteLines(mode),
      validationCommand: "signaler run --mode fidelity",
    };
  }
  return {
    performanceColumnLabel: "P",
    scoreKind: "devtools-parity",
    disclaimer: "Fidelity mode scores are intended for DevTools-like validation. Compare only with matching comparabilityHash.",
    trustNotes: buildTrustNoteLines(mode),
  };
}

export function buildHtmlPerformanceTrustBannerLines(mode: PerformanceScoreDisplayMode): readonly string[] {
  return buildTrustNoteLines(mode);
}
