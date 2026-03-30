import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import type { Phase0BaselineReport, Phase0ReportEntry } from "../phase0/types.js";

const SEVERE_FAILURE_RATE_THRESHOLD = 0.2;
const WARN_FAILURE_RATE_THRESHOLD = 0.1;
const SEVERE_ELAPSED_PCT_THRESHOLD = 0.35;
const WARN_ELAPSED_PCT_THRESHOLD = 0.2;
const SEVERE_ELAPSED_ABS_THRESHOLD_MS = 60_000;
const WARN_ELAPSED_ABS_THRESHOLD_MS = 20_000;

type CliArgs = {
  readonly currentPath: string;
  readonly baselinePath?: string;
};

function parseArgs(argv: readonly string[]): CliArgs {
  let currentPath = "benchmarks/out/phase0-baseline.json";
  let baselinePath: string | undefined = undefined;
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === "--current" && i + 1 < argv.length) {
      currentPath = argv[i + 1];
      i += 1;
      continue;
    }
    if (arg.startsWith("--current=")) {
      currentPath = arg.slice("--current=".length);
      continue;
    }
    if (arg === "--baseline" && i + 1 < argv.length) {
      baselinePath = argv[i + 1];
      i += 1;
      continue;
    }
    if (arg.startsWith("--baseline=")) {
      baselinePath = arg.slice("--baseline=".length);
      continue;
    }
  }
  return {
    currentPath: resolve(currentPath),
    baselinePath: baselinePath ? resolve(baselinePath) : undefined,
  };
}

async function readReport(pathToReport: string): Promise<Phase0BaselineReport | undefined> {
  try {
    const raw = await readFile(pathToReport, "utf8");
    return JSON.parse(raw) as Phase0BaselineReport;
  } catch {
    return undefined;
  }
}

function keyOf(entry: Phase0ReportEntry): string {
  return `${entry.environment}|${entry.profileId}|${entry.runMode}`;
}

function formatMs(value: number): string {
  return `${Math.round(value).toLocaleString()}ms`;
}

function hasRequiredArtifacts(entry: Phase0ReportEntry): boolean {
  return entry.artifactSizes.runJsonBytes > 0 && entry.artifactSizes.summaryJsonBytes > 0;
}

async function main(): Promise<void> {
  const args = parseArgs(process.argv.slice(2));
  const current = await readReport(args.currentPath);
  if (!current) {
    console.error(`[phase2-gate] Missing or invalid current report: ${args.currentPath}`);
    process.exitCode = 1;
    return;
  }
  const baseline = args.baselinePath ? await readReport(args.baselinePath) : undefined;
  const baselineMap = new Map<string, Phase0ReportEntry>((baseline?.entries ?? []).map((entry) => [keyOf(entry), entry]));

  const severeFindings: string[] = [];
  const warnings: string[] = [];
  let comparedEntries = 0;

  for (const entry of current.entries) {
    const id = keyOf(entry);
    const prefix = `[${id}]`;
    if (entry.status === "error") {
      severeFindings.push(`${prefix} status=error`);
    }
    const artifactsPresent = hasRequiredArtifacts(entry);
    if (!artifactsPresent && entry.status === "ok") {
      severeFindings.push(`${prefix} missing required artifacts (run.json/summary.json).`);
    } else if (!artifactsPresent) {
      warnings.push(`${prefix} missing required artifacts due to status=${entry.status}.`);
    }

    const failureRate = entry.metrics.runnerStability?.failureRate;
    if (entry.runMode === "throughput" && typeof failureRate === "number" && failureRate > SEVERE_FAILURE_RATE_THRESHOLD) {
      severeFindings.push(`${prefix} failureRate=${failureRate.toFixed(3)} exceeds ${SEVERE_FAILURE_RATE_THRESHOLD.toFixed(2)}.`);
    } else if (entry.runMode === "throughput" && typeof failureRate === "number" && failureRate > WARN_FAILURE_RATE_THRESHOLD) {
      warnings.push(`${prefix} elevated failureRate=${failureRate.toFixed(3)}.`);
    }

    const baselineEntry = baselineMap.get(id);
    if (baselineEntry && entry.status === "ok" && baselineEntry.status === "ok") {
      const baselineElapsed = baselineEntry.metrics.elapsedMs;
      const currentElapsed = entry.metrics.elapsedMs;
      if (baselineElapsed <= 0 || currentElapsed <= 0) {
        continue;
      }
      comparedEntries += 1;
      const deltaMs = currentElapsed - baselineElapsed;
      const deltaPct = baselineElapsed > 0 ? deltaMs / baselineElapsed : 0;
      if (deltaMs > Math.max(SEVERE_ELAPSED_ABS_THRESHOLD_MS, baselineElapsed * SEVERE_ELAPSED_PCT_THRESHOLD)) {
        severeFindings.push(
          `${prefix} elapsed regression: baseline=${formatMs(baselineElapsed)} current=${formatMs(currentElapsed)} delta=${formatMs(deltaMs)} (${(deltaPct * 100).toFixed(1)}%).`,
        );
      } else if (deltaMs > Math.max(WARN_ELAPSED_ABS_THRESHOLD_MS, baselineElapsed * WARN_ELAPSED_PCT_THRESHOLD)) {
        warnings.push(
          `${prefix} moderate elapsed regression: baseline=${formatMs(baselineElapsed)} current=${formatMs(currentElapsed)} delta=${formatMs(deltaMs)} (${(deltaPct * 100).toFixed(1)}%).`,
        );
      }
    }
  }

  const okCount = current.entries.filter((entry) => entry.status === "ok").length;
  const warnCount = current.entries.filter((entry) => entry.status === "warn").length;
  const errorCount = current.entries.filter((entry) => entry.status === "error").length;

  console.log(`[phase2-gate] evaluated ${current.entries.length} entries`);
  console.log(`[phase2-gate] status summary: ok=${okCount} warn=${warnCount} error=${errorCount}`);
  console.log(`[phase2-gate] baseline comparisons: ${comparedEntries}`);
  console.log(`[phase2-gate] thresholds: severe elapsed>${Math.round(SEVERE_ELAPSED_PCT_THRESHOLD * 100)}% or >${formatMs(SEVERE_ELAPSED_ABS_THRESHOLD_MS)}, severe failureRate>${SEVERE_FAILURE_RATE_THRESHOLD.toFixed(2)}`);

  for (const warning of warnings) {
    console.log(`[phase2-gate][warn] ${warning}`);
  }
  for (const severe of severeFindings) {
    console.error(`[phase2-gate][severe] ${severe}`);
  }
  if (severeFindings.length > 0) {
    process.exitCode = 1;
    return;
  }
  console.log("[phase2-gate] soft gate passed (no severe regressions).");
}

void main();
