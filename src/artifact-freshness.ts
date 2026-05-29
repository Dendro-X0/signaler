import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { resolveArtifactPath } from "./artifact-layout/index.js";
import type { EngineJobResultV1 } from "./engine-contracts/jobs/index.js";
import { isEngineJobResultV1 } from "./engine-contracts/jobs/index.js";

export type ArtifactFreshnessState = "fresh" | "stale" | "incomplete" | "unknown";

export type ArtifactFreshnessReport = {
  readonly state: ArtifactFreshnessState;
  readonly trustArtifacts: boolean;
  readonly warnings: readonly string[];
  readonly jobLatest?: {
    readonly jobId: string;
    readonly status: "success" | "failed";
    readonly startedAt: string;
    readonly completedAt: string;
    readonly exitCode?: number;
    readonly failedStep?: string;
    readonly failureReason?: string;
  };
  readonly primaryArtifactAt?: string;
};

async function readJsonOptional(path: string): Promise<unknown | undefined> {
  try {
    const raw = await readFile(path, "utf8");
    return JSON.parse(raw) as unknown;
  } catch {
    return undefined;
  }
}

function parseIsoMs(value: string | undefined): number | undefined {
  if (value === undefined || value.trim().length === 0) {
    return undefined;
  }
  const parsed = Date.parse(value);
  return Number.isFinite(parsed) ? parsed : undefined;
}

function failedStepFromJob(job: EngineJobResultV1): string | undefined {
  if (job.failedStep !== undefined) {
    return job.failedStep;
  }
  for (const step of job.steps) {
    if (step.exitCode !== 0) {
      return step.command;
    }
  }
  return undefined;
}

function runStepSucceeded(job: EngineJobResultV1): boolean {
  return job.steps.some((step) => step.command === "run" && step.exitCode === 0);
}

/**
 * Evaluate whether `.signaler` artifacts match the latest job attempt.
 */
export async function evaluateArtifactFreshness(dir: string): Promise<ArtifactFreshnessReport> {
  const root = resolve(dir);
  const jobRaw = await readJsonOptional(await resolveArtifactPath(root, "job-latest"));
  const runRaw = await readJsonOptional(await resolveArtifactPath(root, "run"));
  const analyzeRaw = await readJsonOptional(await resolveArtifactPath(root, "analyze"));
  const agentIndexRaw = await readJsonOptional(await resolveArtifactPath(root, "agent-index"));

  const runCompletedAt =
    typeof runRaw === "object" && runRaw !== null && "completedAt" in runRaw
      ? String((runRaw as { completedAt?: unknown }).completedAt ?? "")
      : undefined;
  const analyzeGeneratedAt =
    typeof analyzeRaw === "object" && analyzeRaw !== null && "generatedAt" in analyzeRaw
      ? String((analyzeRaw as { generatedAt?: unknown }).generatedAt ?? "")
      : undefined;
  const agentIndexGeneratedAt =
    typeof agentIndexRaw === "object" && agentIndexRaw !== null && "generatedAt" in agentIndexRaw
      ? String((agentIndexRaw as { generatedAt?: unknown }).generatedAt ?? "")
      : undefined;

  const primaryArtifactAt = analyzeGeneratedAt ?? runCompletedAt ?? agentIndexGeneratedAt;
  const primaryArtifactMs = parseIsoMs(primaryArtifactAt);

  if (!isEngineJobResultV1(jobRaw)) {
    return {
      state: "unknown",
      trustArtifacts: true,
      warnings: [
        "No job-latest.json found. Artifacts may be from manual CLI steps rather than a completed job.",
      ],
      primaryArtifactAt,
    };
  }

  const job = jobRaw;
  const jobStartedMs = parseIsoMs(job.startedAt);
  const jobCompletedMs = parseIsoMs(job.completedAt);
  const failedStep = failedStepFromJob(job);
  const jobLatest = {
    jobId: job.jobId,
    status: job.status,
    startedAt: job.startedAt,
    completedAt: job.completedAt,
    exitCode: job.exitCode,
    failedStep,
    failureReason: job.failureReason,
  };

  if (job.failureReason === "managed-serve") {
    const stale = primaryArtifactMs !== undefined && jobStartedMs !== undefined && primaryArtifactMs < jobStartedMs;
    return {
      state: stale ? "stale" : "incomplete",
      trustArtifacts: !stale,
      warnings: [
        stale
          ? "Latest job failed before managed serve started; run artifacts are from an older successful job."
          : "Latest job failed during managed serve startup; audit artifacts are incomplete.",
        job.failureMessage ?? "Managed serve startup failed.",
      ],
      jobLatest,
      primaryArtifactAt,
    };
  }

  if (job.status === "success") {
    const stale =
      primaryArtifactMs !== undefined
      && jobStartedMs !== undefined
      && primaryArtifactMs < jobStartedMs;
    return {
      state: stale ? "stale" : "fresh",
      trustArtifacts: !stale,
      warnings: stale
        ? ["Primary artifacts predate the latest successful job start. Re-run audit before acting on results."]
        : [],
      jobLatest,
      primaryArtifactAt,
    };
  }

  const runSucceeded = runStepSucceeded(job);
  const runFresh =
    primaryArtifactMs !== undefined
    && jobStartedMs !== undefined
    && primaryArtifactMs >= jobStartedMs;

  if (failedStep === "analyze" && runSucceeded && runFresh) {
    return {
      state: "incomplete",
      trustArtifacts: false,
      warnings: [
        "Latest job failed at analyze. Run artifacts are current; analyze/agent views may be stale.",
        "Use signaler query --view perf and performance-triage.json for current performance triage.",
      ],
      jobLatest,
      primaryArtifactAt,
    };
  }

  if (runFresh) {
    return {
      state: "incomplete",
      trustArtifacts: false,
      warnings: [
        `Latest job failed at step "${failedStep ?? "unknown"}". Artifacts may be partial.`,
      ],
      jobLatest,
      primaryArtifactAt,
    };
  }

  const stale = primaryArtifactMs !== undefined && jobStartedMs !== undefined && primaryArtifactMs < jobStartedMs;
  return {
    state: stale ? "stale" : "incomplete",
    trustArtifacts: !stale,
    warnings: [
      stale
        ? "Latest job failed and primary artifacts predate that job. Treat all projections as stale."
        : "Latest job failed before producing primary artifacts.",
      failedStep ? `Failed step: ${failedStep}.` : "No completed run step in latest job.",
    ],
    jobLatest,
    primaryArtifactAt,
  };
}
