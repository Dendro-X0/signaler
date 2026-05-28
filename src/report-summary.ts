import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { evaluateArtifactFreshness } from "./artifact-freshness.js";
import type { PerformanceTriageV3 } from "./engine-contracts/artifacts/v3/index.js";
import { isPerformanceTriageV3 } from "./performance-triage.js";
import { formatDiscoveryCoverageLine, type DiscoveryCoverage } from "./discovery-coverage.js";

type RunMeta = {
  readonly elapsedMs?: number;
  readonly resolvedParallel?: number;
  readonly comboCount?: number;
};

type AnalyzeActionRow = {
  readonly id: string;
  readonly title: string;
  readonly priorityScore: number;
};

type AnalyzeFile = {
  readonly actions?: readonly AnalyzeActionRow[];
};

type DiscoveryFile = {
  readonly totals?: {
    readonly detected?: number;
    readonly selected?: number;
  };
  readonly coverage?: DiscoveryCoverage;
};

async function readJsonOptional(path: string): Promise<unknown | undefined> {
  try {
    const raw = await readFile(path, "utf8");
    return JSON.parse(raw) as unknown;
  } catch {
    return undefined;
  }
}

export async function printAuditSummary(params: { readonly outputDir: string }): Promise<void> {
  const outputDir = resolve(params.outputDir);
  const run = (await readJsonOptional(resolve(outputDir, "run.json"))) as { readonly meta?: RunMeta } | undefined;
  const triageRaw = await readJsonOptional(resolve(outputDir, "performance-triage.json"));
  const triage = isPerformanceTriageV3(triageRaw) ? (triageRaw as PerformanceTriageV3) : undefined;
  const analyze = (await readJsonOptional(resolve(outputDir, "analyze.json"))) as AnalyzeFile | undefined;
  const discovery = (await readJsonOptional(resolve(outputDir, "discovery.json"))) as DiscoveryFile | undefined;
  const jobLatest = (await readJsonOptional(resolve(outputDir, "job-latest.json"))) as {
    readonly status?: string;
    readonly steps?: readonly { readonly command: string; readonly exitCode: number }[];
  } | undefined;
  const artifactStatus = await evaluateArtifactFreshness(outputDir);

  const lines: string[] = [];
  lines.push("Signaler audit summary");
  lines.push("=====================");
  lines.push(`Artifacts: ${outputDir.replace(/\\/g, "/")}`);
  lines.push("");

  if (discovery?.totals?.detected !== undefined && discovery.totals.selected !== undefined) {
    if (discovery.coverage) {
      lines.push(
        `Discover: ${formatDiscoveryCoverageLine({
          detected: discovery.totals.detected,
          selected: discovery.totals.selected,
          coverage: discovery.coverage,
        })}`,
      );
      if (discovery.coverage.recommendFullScope) {
        lines.push("  Tip: rerun discover with --scope full for broader coverage");
      }
    } else {
      lines.push(`Discover: ${discovery.totals.selected}/${discovery.totals.detected} routes selected`);
    }
  }

  const meta = run?.meta;
  if (meta) {
    const elapsedSec = typeof meta.elapsedMs === "number" ? Math.round(meta.elapsedMs / 1000) : undefined;
    const parts: string[] = [];
    if (typeof meta.comboCount === "number") {
      parts.push(`${meta.comboCount} combos`);
    }
    if (typeof meta.resolvedParallel === "number") {
      parts.push(`parallel ${meta.resolvedParallel}`);
    }
    if (typeof elapsedSec === "number") {
      parts.push(`${elapsedSec}s`);
    }
    if (parts.length > 0) {
      lines.push(`Run: ${parts.join(", ")}`);
    }
  }

  if (triage) {
    lines.push(
      `Performance triage: ${triage.totals.red} red, ${triage.totals.yellow} yellow (${triage.totals.actionable} actionable)`,
    );
    const top = triage.uniqueIssues.slice(0, 5);
    if (top.length > 0) {
      lines.push("Top issues:");
      for (const issue of top) {
        const savings =
          typeof issue.totalEstimatedSavingsMs === "number" ? ` ~${Math.round(issue.totalEstimatedSavingsMs)}ms` : "";
        lines.push(`  - ${issue.title} (${issue.affectedCombos} combos${savings})`);
      }
    }
  }

  const actions = analyze?.actions ?? [];
  if (actions.length > 0) {
    lines.push("Top actions:");
    for (const action of actions.slice(0, 5)) {
      lines.push(`  - [${action.priorityScore}] ${action.title} (${action.id})`);
    }
  }

  if (jobLatest?.steps) {
    const analyzeStep = jobLatest.steps.find((step) => step.command === "analyze");
    if (analyzeStep && analyzeStep.exitCode !== 0) {
      lines.push("");
      lines.push("Job note: analyze step failed (exit 2). Use performance-triage.json and `signaler query --view perf`.");
    }
  }

  if (artifactStatus.state !== "fresh" && artifactStatus.warnings.length > 0) {
    lines.push("");
    lines.push(`Artifact status: ${artifactStatus.state}`);
    for (const warning of artifactStatus.warnings) {
      lines.push(`  - ${warning}`);
    }
  }

  lines.push("");
  lines.push("Next: signaler query --view perf --json | signaler explain --id <issue-id> --json");
  console.log(lines.join("\n"));
}
