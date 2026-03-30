import { access, readFile, stat } from "node:fs/promises";
import { resolve } from "node:path";
import type {
  BaselineEnvironment,
  BenchmarkProfile,
  BenchmarkRunMode,
  Phase0ArtifactSizes,
  Phase0BaselineReport,
  Phase0DiscoveryMetrics,
  Phase0ReportEntry,
  Phase0RunnerStability,
  Phase0Toolchain,
  RustProbeResult,
} from "./types.js";

type CollectEntryParams = {
  readonly environment: BaselineEnvironment;
  readonly profile: BenchmarkProfile;
  readonly runMode: BenchmarkRunMode;
  readonly projectRoot: string;
  readonly fallbackElapsedMs: number;
  readonly commandExitCode: number;
  readonly commandError?: string;
  readonly toolchain: Phase0Toolchain;
  readonly rustProbe?: RustProbeResult;
  readonly notes?: readonly string[];
};

type RunSummaryMeta = {
  readonly elapsedMs?: number;
  readonly averageStepMs?: number;
  readonly comboCount?: number;
  readonly resolvedParallel?: number;
  readonly runnerStability?: {
    readonly totalAttempts?: number;
    readonly totalFailures?: number;
    readonly totalRetries?: number;
    readonly reductions?: number;
    readonly cooldownPauses?: number;
    readonly initialParallel?: number;
    readonly finalParallel?: number;
    readonly failureRate?: number;
    readonly retryRate?: number;
    readonly maxConsecutiveRetries?: number;
    readonly cooldownMsTotal?: number;
    readonly recoveryIncreases?: number;
    readonly status?: "stable" | "degraded" | "unstable";
  };
};

type RunSummaryLike = {
  readonly meta?: RunSummaryMeta;
  readonly results?: readonly {
    readonly runtimeErrorMessage?: string;
  }[];
};

type DiscoveryLike = {
  readonly totals?: {
    readonly detected?: number;
    readonly selected?: number;
    readonly excludedDynamic?: number;
    readonly excludedByFilter?: number;
    readonly excludedByScope?: number;
  };
};

async function fileExists(pathToFile: string): Promise<boolean> {
  try {
    await access(pathToFile);
    return true;
  } catch {
    return false;
  }
}

async function readJsonIfExists<T>(pathToFile: string): Promise<T | undefined> {
  if (!(await fileExists(pathToFile))) {
    return undefined;
  }
  const raw = await readFile(pathToFile, "utf8");
  return JSON.parse(raw) as T;
}

async function getSize(pathToFile: string): Promise<number> {
  if (!(await fileExists(pathToFile))) {
    return 0;
  }
  const fileStats = await stat(pathToFile);
  return fileStats.size;
}

function toDiscoveryMetrics(discovery: DiscoveryLike | undefined): Phase0DiscoveryMetrics | undefined {
  const totals = discovery?.totals;
  if (totals === undefined) {
    return undefined;
  }
  return {
    detected: typeof totals.detected === "number" ? totals.detected : 0,
    selected: typeof totals.selected === "number" ? totals.selected : 0,
    excludedDynamic: typeof totals.excludedDynamic === "number" ? totals.excludedDynamic : 0,
    excludedByFilter: typeof totals.excludedByFilter === "number" ? totals.excludedByFilter : 0,
    excludedByScope: typeof totals.excludedByScope === "number" ? totals.excludedByScope : 0,
  };
}

function toRunnerStability(meta: RunSummaryMeta | undefined): Phase0RunnerStability | undefined {
  const source = meta?.runnerStability;
  if (source === undefined) {
    return undefined;
  }
  return {
    totalAttempts: typeof source.totalAttempts === "number" ? source.totalAttempts : 0,
    totalFailures: typeof source.totalFailures === "number" ? source.totalFailures : 0,
    totalRetries: typeof source.totalRetries === "number" ? source.totalRetries : 0,
    reductions: typeof source.reductions === "number" ? source.reductions : 0,
    cooldownPauses: typeof source.cooldownPauses === "number" ? source.cooldownPauses : 0,
    initialParallel: typeof source.initialParallel === "number" ? source.initialParallel : 0,
    finalParallel: typeof source.finalParallel === "number" ? source.finalParallel : 0,
    failureRate: typeof source.failureRate === "number" ? source.failureRate : undefined,
    retryRate: typeof source.retryRate === "number" ? source.retryRate : undefined,
    maxConsecutiveRetries: typeof source.maxConsecutiveRetries === "number" ? source.maxConsecutiveRetries : undefined,
    cooldownMsTotal: typeof source.cooldownMsTotal === "number" ? source.cooldownMsTotal : undefined,
    recoveryIncreases: typeof source.recoveryIncreases === "number" ? source.recoveryIncreases : undefined,
    status: source.status,
  };
}

function detectRuntimeWarnings(summary: RunSummaryLike | undefined): readonly string[] {
  const warnings: string[] = [];
  const results = summary?.results ?? [];
  const runtimeErrorCount = results.filter(
    (item) => typeof item.runtimeErrorMessage === "string" && item.runtimeErrorMessage.length > 0,
  ).length;
  if (runtimeErrorCount > 0) {
    warnings.push(`Runtime errors in ${runtimeErrorCount} combo(s).`);
  }
  return warnings;
}

async function collectArtifactSizes(projectRoot: string): Promise<Phase0ArtifactSizes> {
  const signalerDir = resolve(projectRoot, ".signaler");
  return {
    runJsonBytes: await getSize(resolve(signalerDir, "run.json")),
    summaryJsonBytes: await getSize(resolve(signalerDir, "summary.json")),
    resultsJsonBytes: await getSize(resolve(signalerDir, "results.json")),
    suggestionsJsonBytes: await getSize(resolve(signalerDir, "suggestions.json")),
  };
}

export async function collectPhase0Entry(params: CollectEntryParams): Promise<Phase0ReportEntry> {
  const signalerDir = resolve(params.projectRoot, ".signaler");
  const summaryPath = resolve(signalerDir, "summary.json");
  const summary = await readJsonIfExists<RunSummaryLike>(summaryPath);
  const discovery = await readJsonIfExists<DiscoveryLike>(resolve(signalerDir, "discovery.json"));
  const artifactSizes = await collectArtifactSizes(params.projectRoot);
  const runtimeWarnings = detectRuntimeWarnings(summary);

  const notes: string[] = [...(params.notes ?? [])];
  if (params.commandError !== undefined) {
    notes.push(params.commandError);
  }
  notes.push(...runtimeWarnings);
  if (artifactSizes.runJsonBytes === 0) {
    notes.push("Missing .signaler/run.json");
  }
  if (artifactSizes.summaryJsonBytes === 0) {
    notes.push("Missing .signaler/summary.json");
  }

  const status: "ok" | "warn" | "error" =
    params.commandExitCode !== 0
      ? "error"
      : notes.length > 0
        ? "warn"
        : "ok";

  const meta = summary?.meta;
  return {
    environment: params.environment,
    profileId: params.profile.id,
    runMode: params.runMode,
    toolchain: params.toolchain,
    metrics: {
      elapsedMs: typeof meta?.elapsedMs === "number" ? meta.elapsedMs : params.fallbackElapsedMs,
      avgStepMs: typeof meta?.averageStepMs === "number" ? meta.averageStepMs : 0,
      comboCount: typeof meta?.comboCount === "number" ? meta.comboCount : 0,
      resolvedParallel: typeof meta?.resolvedParallel === "number" ? meta.resolvedParallel : 0,
      runnerStability: toRunnerStability(meta),
    },
    discovery: toDiscoveryMetrics(discovery),
    artifactSizes,
    status,
    notes: notes.length > 0 ? notes : undefined,
    rustProbe: params.rustProbe,
  };
}

export function buildPhase0Report(entries: readonly Phase0ReportEntry[]): Phase0BaselineReport {
  return {
    schemaVersion: 1,
    generatedAt: new Date().toISOString(),
    entries,
    summary: {
      total: entries.length,
      ok: entries.filter((entry) => entry.status === "ok").length,
      warn: entries.filter((entry) => entry.status === "warn").length,
      error: entries.filter((entry) => entry.status === "error").length,
    },
  };
}
