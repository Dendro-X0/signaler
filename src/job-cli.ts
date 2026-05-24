import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import type { EngineJobResultV1, EngineJobV1 } from "./engine-contracts/jobs/index.js";
import { isEngineJobResultV1, isEngineJobV1 } from "./engine-contracts/jobs/index.js";
import {
  buildAgentPresetJob,
  buildPresetJob,
  createDefaultEngineJobStepRunner,
  createInProcessEngineJobStepRunner,
  ensureManagedProductionServer,
  executeEngineJob,
  type BuildPresetJobParams,
  type EngineJobPreset,
} from "./engine/index.js";

type JobCliArgs = BuildPresetJobParams & {
  readonly subcommand: "run" | "status" | "show";
  readonly preset?: EngineJobPreset;
  readonly jobFile?: string;
  readonly inProcess: boolean;
  readonly managedServe: boolean;
  readonly managedServeSkipBuild: boolean;
  readonly managedServeReuse: boolean;
  readonly json: boolean;
};

function parsePreset(value: string): EngineJobPreset {
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
  let inProcess = process.env.SIGNALER_JOB_IN_PROCESS === "1";
  let managedServe = process.env.SIGNALER_MANAGED_SERVE === "1";
  let managedServeSkipBuild = false;
  let managedServeReuse = process.env.SIGNALER_MANAGED_SERVE_REUSE === "1";
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
    if (arg === "--in-process") {
      inProcess = true;
      continue;
    }
    if (arg === "--managed-serve" || arg === "--auto-serve") {
      managedServe = true;
      continue;
    }
    if (arg === "--managed-serve-skip-build") {
      managedServeSkipBuild = true;
      continue;
    }
    if (arg === "--managed-serve-reuse") {
      managedServeReuse = true;
      continue;
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
    if (arg === "--json") {
      json = true;
    }
  }

  return {
    subcommand,
    preset,
    jobFile,
    cwd,
    outputDir,
    baseUrl,
    configPath,
    discoverScope,
    buildId,
    incremental,
    inProcess,
    managedServe,
    managedServeSkipBuild,
    managedServeReuse,
    parallel,
    json,
  };
}

function resolveJob(args: JobCliArgs): EngineJobV1 {
  if (args.preset) {
    return buildPresetJob({ ...args, preset: args.preset });
  }
  return buildAgentPresetJob(args);
}

export async function runJobCli(argv: readonly string[]): Promise<void> {
  const args = parseArgs(argv);

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

  let job: EngineJobV1;
  if (args.jobFile) {
    const raw = await readFile(args.jobFile, "utf8");
    const parsed = JSON.parse(raw) as unknown;
    if (!isEngineJobV1(parsed)) {
      throw new Error(`Invalid job file: ${args.jobFile}`);
    }
    job = parsed;
  } else {
    job = resolveJob(args);
  }

  let managedServer: Awaited<ReturnType<typeof ensureManagedProductionServer>> | undefined;
  if (args.managedServe) {
    managedServer = await ensureManagedProductionServer({
      projectRoot: job.cwd,
      baseUrl: args.baseUrl ?? "http://127.0.0.1:3000",
      skipBuild: args.managedServeSkipBuild,
      reuseUnhealthy: args.managedServeReuse,
    });
    if (managedServer.startedBySignaler) {
      job = {
        ...job,
        steps: job.steps.map((step) => {
          if (step.command !== "discover") {
            return step;
          }
          const nextArgs = [...(step.args ?? [])];
          const baseUrlIndex = nextArgs.findIndex((value) => value === "--base-url");
          if (baseUrlIndex >= 0 && baseUrlIndex + 1 < nextArgs.length) {
            nextArgs[baseUrlIndex + 1] = managedServer!.baseUrl;
          } else {
            nextArgs.push("--base-url", managedServer!.baseUrl);
          }
          return { ...step, args: nextArgs };
        }),
      };
    }
  }

  try {
    const stepRunner = args.inProcess
      ? createInProcessEngineJobStepRunner()
      : createDefaultEngineJobStepRunner();
    const outcome = await executeEngineJob({ job, stepRunner });

    if (args.json) {
      console.log(JSON.stringify(outcome.result, null, 2));
    } else {
      console.log(`Job ${outcome.result.jobId}: ${outcome.result.status} (${outcome.result.elapsedMs}ms)`);
      console.log(`Artifacts: ${resolve(job.cwd, job.outputDir, "jobs", job.jobId)}`);
      console.log("Latest status: .signaler/job-latest.json");
      if (managedServer?.startedBySignaler) {
        console.log(`Managed serve: production server at ${managedServer.baseUrl}`);
      }
      if (job.preset === "pr") {
        console.log("Tip: after a fix, run `signaler verify --contract v6` then `signaler query --view delta`.");
      }
    }

    process.exitCode = outcome.exitCode;
    if (!args.json && outcome.exitCode === 2) {
      console.log(
        "Job partial success: run completed; analyze failed. Use performance-triage.json and signaler query --view perf.",
      );
    }
  } finally {
    if (managedServer?.startedBySignaler) {
      console.log("Managed serve: stopping production server...");
      await managedServer.stop();
    }
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
