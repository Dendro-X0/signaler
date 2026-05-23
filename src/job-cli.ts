import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";
import type { EngineJobResultV1, EngineJobStepV1, EngineJobV1 } from "./contracts/jobs/engine-job-v1.js";
import { isEngineJobResultV1, isEngineJobV1 } from "./contracts/jobs/engine-job-v1.js";

type JobPreset = "agent" | "ci" | "pr";

type JobCliArgs = {
  readonly subcommand: "run" | "status" | "show";
  readonly preset?: JobPreset;
  readonly jobFile?: string;
  readonly cwd: string;
  readonly outputDir: string;
  readonly baseUrl?: string;
  readonly configPath?: string;
  readonly discoverScope: string;
  readonly buildId?: string;
  readonly incremental: boolean;
  readonly json: boolean;
};

function appendConfigArg(args: string[], configPath?: string): string[] {
  if (!configPath || configPath.trim().length === 0) {
    return args;
  }
  return [...args, "--config", configPath];
}

function repoBinPath(): string {
  const here = dirname(fileURLToPath(import.meta.url));
  return resolve(here, "bin.js");
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

function parsePreset(value: string): JobPreset {
  if (value === "agent" || value === "ci" || value === "pr") {
    return value;
  }
  throw new Error(`Invalid --preset value: ${value}. Expected agent|ci|pr.`);
}

function parseArgs(argv: readonly string[]): JobCliArgs {
  let subcommand: JobCliArgs["subcommand"] = "run";
  let preset: JobCliArgs["preset"];
  let jobFile: string | undefined;
  let cwd = process.cwd();
  let outputDir = resolve(cwd, ".signaler");
  let baseUrl: string | undefined;
  let configPath: string | undefined;
  let discoverScope = process.env.SIGNALER_DISCOVER_SCOPE?.trim() || "full";
  let buildId: string | undefined;
  let incremental = false;
  let json = false;

  const tokens = argv.slice(2);
  if (tokens[0] === "run" || tokens[0] === "status" || tokens[0] === "show") {
    subcommand = tokens[0];
  }

  for (let i = 2; i < argv.length; i += 1) {
    const arg = argv[i] ?? "";
    if (arg === "run" || arg === "status" || arg === "show") {
      subcommand = arg;
      continue;
    }
    if (arg === "--preset" && i + 1 < argv.length) {
      preset = parsePreset(argv[i + 1] ?? "");
      i += 1;
      continue;
    }
    if (arg === "--file" && i + 1 < argv.length) {
      jobFile = resolve(argv[i + 1] ?? "");
      i += 1;
      continue;
    }
    if (arg === "--cwd" && i + 1 < argv.length) {
      cwd = resolve(argv[i + 1] ?? cwd);
      i += 1;
      continue;
    }
    if ((arg === "--dir" || arg === "--output-dir") && i + 1 < argv.length) {
      outputDir = resolve(argv[i + 1] ?? outputDir);
      i += 1;
      continue;
    }
    if (arg === "--base-url" && i + 1 < argv.length) {
      baseUrl = argv[i + 1];
      i += 1;
      continue;
    }
    if (arg === "--config" && i + 1 < argv.length) {
      configPath = resolve(argv[i + 1] ?? "");
      i += 1;
      continue;
    }
    if (arg === "--scope" && i + 1 < argv.length) {
      discoverScope = argv[i + 1] ?? discoverScope;
      i += 1;
      continue;
    }
    if (arg === "--build-id" && i + 1 < argv.length) {
      buildId = argv[i + 1];
      i += 1;
      continue;
    }
    if (arg === "--incremental") {
      incremental = true;
      continue;
    }
    if (arg === "--json") {
      json = true;
    }
  }

  return { subcommand, preset, jobFile, cwd, outputDir, baseUrl, configPath, discoverScope, buildId, incremental, json };
}

function buildAgentPresetJob(params: {
  readonly cwd: string;
  readonly outputDir: string;
  readonly baseUrl?: string;
  readonly configPath?: string;
  readonly discoverScope?: string;
}): EngineJobV1 {
  let discoverArgs: string[] = ["--scope", params.discoverScope ?? "full", "--non-interactive", "--yes", "--project-root", params.cwd];
  if (params.baseUrl) {
    discoverArgs.push("--base-url", params.baseUrl);
  }
  discoverArgs = appendConfigArg(discoverArgs, params.configPath);
  const outputDirArg = resolveOutputDirArg(params);
  const steps: EngineJobStepV1[] = [
    { command: "discover", args: discoverArgs },
    {
      command: "run",
      args: appendConfigArg(
        ["--contract", "v3", "--mode", "throughput", "--artifact-profile", "lean", "--ci", "--no-color", "--yes"],
        params.configPath,
      ),
    },
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

function buildCiPresetJob(params: { readonly cwd: string; readonly outputDir: string; readonly baseUrl?: string }): EngineJobV1 {
  const job = buildAgentPresetJob(params);
  return {
    ...job,
    preset: "ci",
    steps: job.steps.map((step) =>
      step.command === "run"
        ? {
            ...step,
            args: [
              ...(step.args ?? []),
              "--fail-on-budget",
            ],
          }
        : step,
    ),
  };
}

function buildPrPresetJob(params: {
  readonly cwd: string;
  readonly outputDir: string;
  readonly configPath?: string;
  readonly buildId?: string;
  readonly incremental: boolean;
}): EngineJobV1 {
  const outputDirArg = resolveOutputDirArg(params);
  let runArgs: string[] = [
    "--contract",
    "v3",
    "--mode",
    "throughput",
    "--artifact-profile",
    "lean",
    "--ci",
    "--no-color",
    "--yes",
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

function buildPresetJob(params: JobCliArgs): EngineJobV1 {
  if (params.preset === "ci") {
    return buildCiPresetJob(params);
  }
  if (params.preset === "pr") {
    return buildPrPresetJob(params);
  }
  return buildAgentPresetJob(params);
}

function runStep(params: { readonly cwd: string; readonly step: EngineJobStepV1 }): { readonly exitCode: number; readonly elapsedMs: number } {
  const startedAt = Date.now();
  const argv = [params.step.command, ...(params.step.args ?? [])];
  const result = spawnSync(process.execPath, [repoBinPath(), ...argv], {
    cwd: params.cwd,
    stdio: "inherit",
    env: process.env,
  });
  return {
    exitCode: result.status ?? 1,
    elapsedMs: Date.now() - startedAt,
  };
}

async function writeJobArtifacts(params: {
  readonly job: EngineJobV1;
  readonly result: EngineJobResultV1;
}): Promise<void> {
  const outputRoot = resolve(params.job.cwd, params.job.outputDir);
  const jobsDir = resolve(outputRoot, "jobs", params.job.jobId);
  await mkdir(jobsDir, { recursive: true });
  await writeFile(resolve(jobsDir, "job.json"), `${JSON.stringify(params.job, null, 2)}\n`, "utf8");
  await writeFile(resolve(jobsDir, "job-result.json"), `${JSON.stringify(params.result, null, 2)}\n`, "utf8");
  await writeFile(resolve(outputRoot, "job-latest.json"), `${JSON.stringify(params.result, null, 2)}\n`, "utf8");
}

export async function runJobCli(argv: readonly string[]): Promise<void> {
  const args = parseArgs(argv);

  if (args.subcommand === "show") {
    const presetJob = args.preset ? buildPresetJob(args) : buildAgentPresetJob(args);
    console.log(JSON.stringify(presetJob, null, args.json ? 2 : undefined));
    return;
  }

  if (args.subcommand === "status") {
    const resultPath = resolve(args.cwd, args.outputDir, "job-latest.json");
    const raw = await readFile(resultPath, "utf8");
    const parsed = JSON.parse(raw) as unknown;
    if (!isEngineJobResultV1(parsed)) {
      throw new Error(`Invalid job result file: ${resultPath}`);
    }
    if (args.json) {
      console.log(JSON.stringify(parsed, null, 2));
    } else {
      console.log(`Job ${parsed.jobId}: ${parsed.status} (${parsed.elapsedMs}ms)`);
      for (const step of parsed.steps) {
        console.log(`  - ${step.command}: exit ${step.exitCode} (${step.elapsedMs}ms)`);
      }
    }
    return;
  }

  let job: EngineJobV1;
  if (args.jobFile) {
    const raw = await readFile(args.jobFile, "utf8");
    const parsed = JSON.parse(raw) as unknown;
    if (!isEngineJobV1(parsed)) {
      throw new Error(`Invalid job file: ${args.jobFile}`);
    }
    job = parsed;
  } else if (args.preset) {
    job = buildPresetJob(args);
  } else {
    job = buildAgentPresetJob(args);
  }

  const startedAt = new Date().toISOString();
  const startedMs = Date.now();
  const stepResults: EngineJobResultV1["steps"][number][] = [];
  let failed = false;

  for (const step of job.steps) {
    const outcome = runStep({ cwd: job.cwd, step });
    stepResults.push({
      command: step.command,
      exitCode: outcome.exitCode,
      elapsedMs: outcome.elapsedMs,
    });
    if (outcome.exitCode !== 0) {
      failed = true;
      break;
    }
  }

  const result: EngineJobResultV1 = {
    schemaVersion: 1,
    jobId: job.jobId,
    status: failed ? "failed" : "success",
    startedAt,
    completedAt: new Date().toISOString(),
    elapsedMs: Date.now() - startedMs,
    steps: stepResults,
    primaryArtifacts: [
      "agent-index.json",
      "performance-triage.json",
      "analyze.json",
      "run.json",
    ],
  };

  await writeJobArtifacts({ job, result });

  if (args.json) {
    console.log(JSON.stringify(result, null, 2));
  } else {
    console.log(`Job ${result.jobId}: ${result.status} (${result.elapsedMs}ms)`);
    console.log(`Artifacts: ${resolve(job.cwd, job.outputDir, "jobs", job.jobId)}`);
    console.log("Latest status: .signaler/job-latest.json");
    if (job.preset === "pr") {
      console.log("Tip: after a fix, run `signaler verify --contract v6` then `signaler query --view delta`.");
    }
  }

  process.exitCode = failed ? 1 : 0;
}
