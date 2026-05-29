import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import type { EngineJobResultV1, EngineJobV1 } from "./engine-contracts/jobs/index.js";
import { isEngineJobResultV1, isEngineJobV1 } from "./engine-contracts/jobs/index.js";
import {
  buildAgentPresetJob,
  buildPresetJob,
  buildQualityProfileJob,
  buildRunProfileJob,
  parseQualityProfileName,
  parseRunProfileName,
  type BuildPresetJobParams,
  type EngineJobPreset,
  type QualityProfileName,
  type RunProfileName,
} from "./engine/index.js";
import { runPresetJob } from "./engine/jobs/run-preset-job.js";
import type { ManagedServeMode } from "./engine/serve/index.js";
import { parseArtifactLayoutMode, resolveArtifactLayoutFromEnv, type ArtifactLayoutMode } from "./artifact-layout/index.js";
import {
  applyOrchestratorServeFlag,
  createOrchestratorServeDefaults,
  type OrchestratorServeOptions,
} from "./shell/orchestrator-serve-options.js";

export type JobCliArgs = BuildPresetJobParams & {
  readonly subcommand: "run" | "status" | "show";
  readonly preset?: EngineJobPreset;
  readonly runProfile?: RunProfileName;
  readonly qualityProfile?: QualityProfileName;
  readonly jobFile?: string;
  readonly inProcess: boolean;
  readonly managedServe: boolean;
  readonly managedServeMode: ManagedServeMode;
  readonly managedServeSkipBuild: boolean;
  readonly managedServeReuse: boolean;
  readonly artifactLayout: ArtifactLayoutMode;
  readonly json: boolean;
};

function parsePreset(value: string): EngineJobPreset {
  if (value === "agent" || value === "ci" || value === "pr") {
    return value;
  }
  throw new Error(`Invalid --preset value: ${value}. Expected agent|ci|pr.`);
}

export function parseJobCliArgs(argv: readonly string[]): JobCliArgs {
  let subcommand: JobCliArgs["subcommand"] = "run";
  let preset: JobCliArgs["preset"];
  let runProfile: JobCliArgs["runProfile"];
  let qualityProfile: JobCliArgs["qualityProfile"];
  let jobFile: string | undefined;
  let cwd = process.cwd();
  let outputDir = resolve(cwd, ".signaler");
  let baseUrl: string | undefined;
  let configPath: string | undefined;
  let discoverScope = process.env.SIGNALER_DISCOVER_SCOPE?.trim() || "full";
  let buildId: string | undefined;
  let incremental = false;
  let incrementalSkipPassing = false;
  let routesFile: string | undefined;
  const serveOptions: OrchestratorServeOptions = createOrchestratorServeDefaults();
  let artifactLayout: ArtifactLayoutMode = resolveArtifactLayoutFromEnv();
  let parallel: number | undefined;
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
    if (arg === "--run-profile" && i + 1 < argv.length) {
      runProfile = parseRunProfileName(argv[i + 1] ?? "");
      i += 1;
      continue;
    }
    if (arg === "--quality-profile" && i + 1 < argv.length) {
      qualityProfile = parseQualityProfileName(argv[i + 1] ?? "");
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
    {
      const skip = applyOrchestratorServeFlag(arg, argv, i, serveOptions);
      if (skip >= 0) {
        i += skip;
        continue;
      }
    }
    if (arg === "--parallel" && i + 1 < argv.length) {
      const value = Number.parseInt(argv[i + 1] ?? "", 10);
      if (!Number.isFinite(value) || value < 1 || value > 10) {
        throw new Error(`Invalid --parallel value: ${argv[i + 1]}. Expected integer between 1 and 10.`);
      }
      parallel = value;
      i += 1;
      continue;
    }
    if (arg === "--incremental-skip") {
      incrementalSkipPassing = true;
      continue;
    }
    if (arg === "--routes-file" && i + 1 < argv.length) {
      routesFile = resolve(argv[i + 1] ?? "");
      i += 1;
      continue;
    }
    if (arg === "--json") {
      json = true;
      continue;
    }
    if (arg === "--artifact-layout" && i + 1 < argv.length) {
      artifactLayout = parseArtifactLayoutMode(argv[i + 1]);
      i += 1;
    }
  }

  if (preset && runProfile) {
    throw new Error("Use either --preset or --run-profile, not both.");
  }
  if (qualityProfile && (preset || runProfile)) {
    throw new Error("Use --quality-profile alone (not with --preset or --run-profile).");
  }

  return {
    subcommand,
    preset,
    runProfile,
    qualityProfile,
    jobFile,
    cwd,
    outputDir,
    baseUrl,
    configPath,
    discoverScope,
    buildId,
    incremental,
    incrementalSkipPassing,
    inProcess: serveOptions.inProcess,
    managedServe: serveOptions.managedServe,
    managedServeMode: serveOptions.managedServeMode,
    managedServeSkipBuild: serveOptions.managedServeSkipBuild,
    managedServeReuse: serveOptions.managedServeReuse,
    artifactLayout,
    parallel,
    routesFile,
    json,
  };
}

function resolveJob(args: JobCliArgs): EngineJobV1 {
  if (args.qualityProfile) {
    return buildQualityProfileJob({ ...args, qualityProfile: args.qualityProfile });
  }
  if (args.runProfile) {
    return buildRunProfileJob({ ...args, runProfile: args.runProfile });
  }
  if (args.preset) {
    return buildPresetJob({ ...args, preset: args.preset });
  }
  return buildAgentPresetJob(args);
}

export async function runJobCli(argv: readonly string[]): Promise<void> {
  const args = parseJobCliArgs(argv);

  if (args.subcommand === "show") {
    const presetJob = resolveJob(args);
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
    printJobResult(parsed, args.json);
    return;
  }

  const outcome = await runPresetJob({
    cwd: args.cwd,
    outputDir: args.outputDir,
    baseUrl: args.baseUrl,
    configPath: args.configPath,
    discoverScope: args.discoverScope,
    buildId: args.buildId,
    incremental: args.incremental,
    incrementalSkipPassing: args.incrementalSkipPassing,
    routesFile: args.routesFile,
    parallel: args.parallel,
    preset: args.preset,
    runProfile: args.runProfile,
    qualityProfile: args.qualityProfile,
    jobFile: args.jobFile,
    inProcess: args.inProcess,
    managedServe: args.managedServe,
    managedServeMode: args.managedServeMode,
    managedServeSkipBuild: args.managedServeSkipBuild,
    managedServeReuse: args.managedServeReuse,
    artifactLayout: args.artifactLayout,
  });

  if (args.json) {
    console.log(JSON.stringify(outcome.result, null, 2));
  } else {
    console.log(`Job ${outcome.result.jobId}: ${outcome.result.status} (${outcome.result.elapsedMs}ms)`);
    console.log(`Artifacts: ${resolve(outcome.job.cwd, outcome.job.outputDir, "jobs", outcome.job.jobId)}`);
    console.log("Latest status: .signaler/job-latest.json");
    if (outcome.managedBaseUrl) {
      console.log(`Managed serve: ${outcome.managedBaseUrl}`);
    }
    if (outcome.job.preset === "pr") {
      console.log("Tip: after a fix, run `signaler verify --contract v6` then `signaler query --view delta`.");
    }
  }

  process.exitCode = outcome.exitCode;
  if (!args.json && outcome.exitCode === 2) {
    console.log(
      "Job partial success: run completed; analyze failed. Use performance-triage.json and signaler query --view perf.",
    );
  }
}

function printJobResult(parsed: EngineJobResultV1, json: boolean): void {
  if (json) {
    console.log(JSON.stringify(parsed, null, 2));
    return;
  }
  console.log(`Job ${parsed.jobId}: ${parsed.status} (${parsed.elapsedMs}ms)`);
  for (const step of parsed.steps) {
    console.log(`  - ${step.command}: exit ${step.exitCode} (${step.elapsedMs}ms)`);
  }
}
