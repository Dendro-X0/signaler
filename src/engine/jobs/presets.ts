import { spawnSync } from "node:child_process";
import { resolve } from "node:path";
import type { EngineJobStepV1, EngineJobV1 } from "../../engine-contracts/jobs/index.js";
import type { EngineJobPreset } from "./types.js";

export type BuildPresetJobParams = {
  readonly cwd: string;
  readonly outputDir: string;
  readonly baseUrl?: string;
  readonly configPath?: string;
  readonly discoverScope?: string;
  readonly buildId?: string;
  readonly incremental?: boolean;
  readonly incrementalSkipPassing?: boolean;
  readonly routesFile?: string;
  readonly parallel?: number;
};

const DEFAULT_AGENT_PARALLEL = 6;

export function resolveAgentJobParallel(explicit?: number): number {
  if (typeof explicit === "number" && Number.isFinite(explicit) && explicit >= 1 && explicit <= 10) {
    return Math.floor(explicit);
  }
  const fromEnv = process.env.SIGNALER_PARALLEL?.trim();
  if (fromEnv) {
    const parsed = Number.parseInt(fromEnv, 10);
    if (Number.isFinite(parsed) && parsed >= 1 && parsed <= 10) {
      return parsed;
    }
  }
  return DEFAULT_AGENT_PARALLEL;
}

function appendConfigArg(args: string[], configPath?: string): string[] {
  if (!configPath || configPath.trim().length === 0) {
    return args;
  }
  return [...args, "--config", configPath];
}

function resolveOutputDirArg(params: { readonly cwd: string; readonly outputDir: string }): string {
  return resolve(params.cwd, params.outputDir);
}

function resolveBuildId(params: { readonly cwd: string; readonly explicit?: string }): string | undefined {
  if (params.explicit && params.explicit.trim().length > 0) {
    return params.explicit.trim();
  }
  const envBuildId = process.env.SIGNALER_BUILD_ID?.trim();
  if (envBuildId && envBuildId.length > 0) {
    return envBuildId;
  }
  const git = spawnSync("git", ["rev-parse", "--short", "HEAD"], {
    cwd: params.cwd,
    encoding: "utf8",
  });
  if (git.status === 0) {
    const value = (git.stdout ?? "").trim();
    if (value.length > 0) {
      return value;
    }
  }
  return undefined;
}

export function buildAgentPresetJob(params: BuildPresetJobParams): EngineJobV1 {
  let discoverArgs: string[] = [
    "--scope",
    params.discoverScope ?? "full",
    "--non-interactive",
    "--yes",
    "--project-root",
    params.cwd,
  ];
  if (params.baseUrl) {
    discoverArgs.push("--base-url", params.baseUrl);
  }
  discoverArgs = appendConfigArg(discoverArgs, params.configPath);
  if (params.routesFile) {
    discoverArgs.push("--routes-file", params.routesFile);
  }
  const outputDirArg = resolveOutputDirArg(params);
  const parallel = resolveAgentJobParallel(params.parallel);
  let runArgs: string[] = appendConfigArg(
    [
      "--contract",
      "v3",
      "--mode",
      "throughput",
      "--artifact-profile",
      "lean",
      "--ci",
      "--yes",
      "--parallel",
      String(parallel),
    ],
    params.configPath,
  );
  if (params.incrementalSkipPassing) {
    runArgs.push("--incremental-skip");
  }
  if (params.incremental) {
    const resolvedBuildId = resolveBuildId({ cwd: params.cwd, explicit: params.buildId });
    if (resolvedBuildId) {
      runArgs.push("--incremental", "--build-id", resolvedBuildId);
    }
  }
  const steps: EngineJobStepV1[] = [
    { command: "discover", args: discoverArgs },
    { command: "run", args: runArgs },
    { command: "analyze", args: ["--contract", "v6", "--artifact-profile", "lean", "--dir", outputDirArg] },
  ];
  return {
    schemaVersion: 1,
    jobId: `job-${Date.now()}`,
    createdAt: new Date().toISOString(),
    cwd: params.cwd,
    outputDir: params.outputDir,
    preset: "agent",
    steps,
  };
}

export function buildCiPresetJob(params: BuildPresetJobParams): EngineJobV1 {
  const job = buildAgentPresetJob(params);
  return {
    ...job,
    preset: "ci",
    steps: job.steps.map((step) =>
      step.command === "run"
        ? {
            ...step,
            args: [...(step.args ?? []), "--fail-on-budget"],
          }
        : step,
    ),
  };
}

export function buildPrPresetJob(params: BuildPresetJobParams): EngineJobV1 {
  const outputDirArg = resolveOutputDirArg(params);
  const parallel = resolveAgentJobParallel(params.parallel);
  let runArgs: string[] = [
    "--contract",
    "v3",
    "--mode",
    "throughput",
    "--artifact-profile",
    "lean",
    "--ci",
    "--yes",
    "--parallel",
    String(parallel),
    "--changed-only",
  ];
  runArgs = appendConfigArg(runArgs, params.configPath);
  const resolvedBuildId = resolveBuildId({ cwd: params.cwd, explicit: params.buildId });
  if (params.incremental) {
    if (!resolvedBuildId) {
      throw new Error("PR incremental job requires --build-id, SIGNALER_BUILD_ID, or a git repository for default build id.");
    }
    runArgs.push("--incremental", "--build-id", resolvedBuildId);
  }
  const steps: EngineJobStepV1[] = [
    { command: "run", args: runArgs },
    { command: "analyze", args: ["--contract", "v6", "--artifact-profile", "lean", "--dir", outputDirArg] },
  ];
  return {
    schemaVersion: 1,
    jobId: `job-${Date.now()}`,
    createdAt: new Date().toISOString(),
    cwd: params.cwd,
    outputDir: params.outputDir,
    preset: "pr",
    steps,
  };
}

export function buildPresetJob(params: BuildPresetJobParams & { readonly preset: EngineJobPreset }): EngineJobV1 {
  if (params.preset === "ci") {
    return buildCiPresetJob(params);
  }
  if (params.preset === "pr") {
    return buildPrPresetJob(params);
  }
  return buildAgentPresetJob(params);
}
