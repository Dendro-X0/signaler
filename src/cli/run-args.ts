import { resolve } from 'node:path';
import type {
  ApexDevice,
  ApexThrottlingMethod,
  ApexThroughputBackoffPolicy,
} from '../core/types.js';
import type { ManagedServeMode } from '../engine/index.js';
import { validateWebhookUrl } from '../performance-budget.js';
import type { MachineArtifactProfile } from '../machine-output-profile.js';
import {
  applyOrchestratorServeFlag,
  createOrchestratorServeDefaults,
  type OrchestratorServeOptions,
} from '../shell/orchestrator-serve-options.js';

type CliLogLevel = 'silent' | 'error' | 'info' | 'verbose';
type CliColorMode = 'auto' | 'always' | 'never';

export type { CliLogLevel, CliColorMode };

type RunnerMode = "fidelity" | "throughput";

export type CliArgs = {
  readonly configPath: string;
  readonly ci: boolean;
  readonly failOnBudget: boolean;
  readonly failOnQualityGate: boolean;
  readonly failOnBaselineCompare: boolean;
  readonly colorMode: CliColorMode;
  readonly logLevelOverride: CliLogLevel | undefined;
  readonly deviceFilter: ApexDevice | undefined;
  readonly throttlingMethodOverride: ApexThrottlingMethod | undefined;
  readonly cpuSlowdownOverride: number | undefined;
  readonly parallelOverride: number | undefined;
  readonly auditTimeoutMsOverride: number | undefined;
  readonly diagnostics: boolean;
  readonly lhr: boolean;
  readonly plan: boolean;
  readonly flagsOnly: boolean;
  readonly yes: boolean;
  readonly maxSteps: number | undefined;
  readonly maxCombos: number | undefined;
  readonly stable: boolean;
  readonly openReport: boolean;
  readonly warmUp: boolean;
  readonly incremental: boolean;
  readonly incrementalSkipPassing: boolean;
  readonly buildId: string | undefined;
  readonly runsOverride: number | undefined;
  readonly quick: boolean;
  readonly accurate: boolean;
  readonly devtoolsAccurate: boolean;
  readonly jsonOutput: boolean;
  readonly showParallel: boolean;
  readonly fast: boolean;
  readonly overview: boolean;
  readonly overviewCombos: number | undefined;
  readonly regressionsOnly: boolean;
  readonly changedOnly: boolean;
  readonly rerunFailing: boolean;
  readonly focusWorst: number | undefined;
  readonly aiMinCombos: number | undefined;
  readonly noAiFix: boolean;
  readonly noExport: boolean;
  readonly accessibilityPass: boolean;
  readonly webhookUrl: string | undefined;
  readonly webhookAlways: boolean;
  readonly ciPlatform: "github" | "gitlab" | "jenkins" | undefined;
  readonly budgetWebhookUrl: string | undefined;
  readonly budgetWebhookRetries: number | undefined;
  readonly mode: "fidelity" | "throughput" | undefined;
  readonly parity: boolean;
  readonly contractVersion: "legacy" | "v3";
  readonly legacyArtifacts: boolean;
  readonly baselinePath: string | undefined;
  readonly isolationOverride: "shared" | "per-audit" | "browser" | undefined;
  readonly throughputBackoffOverride: ApexThroughputBackoffPolicy | undefined;
  readonly externalSignalsPaths: readonly string[];
  readonly benchmarkSignalsPaths: readonly string[];
  readonly artifactProfile: MachineArtifactProfile;
  readonly machineTokenBudgetOverride: number | undefined;
  readonly perfIncludeYellow: boolean | undefined;
  readonly managedServe: boolean;
  readonly managedServeMode: ManagedServeMode;
  readonly managedServeSkipBuild: boolean;
  readonly managedServeReuse: boolean;
  readonly serveEnvOverrides: Readonly<Record<string, string>>;
  readonly labAuth: boolean;
  readonly noAuditBypass: boolean;
  readonly serveOptions: OrchestratorServeOptions;
}

export function parseRunCliArgs(argv: readonly string[]): CliArgs {
  let configPath: string | undefined;
  let ci: boolean = false;
  let failOnBudget: boolean = false;
  let failOnQualityGate: boolean = false;
  let failOnBaselineCompare: boolean = false;
  let colorMode: CliColorMode = "auto";
  let logLevelOverride: CliLogLevel | undefined;
  let deviceFilter: ApexDevice | undefined;
  let throttlingMethodOverride: ApexThrottlingMethod | undefined;
  let cpuSlowdownOverride: number | undefined;
  let parallelOverride: number | undefined;
  let auditTimeoutMsOverride: number | undefined;
  let diagnostics = false;
  let lhr = false;
  let plan = false;
  let flagsOnly = false;
  let yes = false;
  let maxSteps: number | undefined;
  let maxCombos: number | undefined;
  let stable = false;
  let openReport = false;
  let warmUp = false;
  let incremental = false;
  let incrementalSkipPassing = false;
  let buildId: string | undefined;
  let runsOverride: number | undefined;
  let quick = false;
  let accurate = false;
  let devtoolsAccurate = false;
  let jsonOutput = false;
  let showParallel = false;
  let fast = false;
  let overview = false;
  let overviewCombos: number | undefined;
  let regressionsOnly = false;
  let changedOnly = false;
  let rerunFailing = false;
  let focusWorst: number | undefined;
  let aiMinCombos: number | undefined;
  let noAiFix = false;
  let noExport = false;
  let accessibilityPass = false;
  let webhookUrl: string | undefined;
  let webhookAlways = false;
  let ciPlatform: "github" | "gitlab" | "jenkins" | undefined;
  let budgetWebhookUrl: string | undefined;
  let budgetWebhookRetries: number | undefined;
  let mode: RunnerMode | undefined;
  let parity = false;
  let contractVersion: "legacy" | "v3" = "legacy";
  let legacyArtifacts = false;
  let baselinePath: string | undefined;
  let isolationOverride: "shared" | "per-audit" | "browser" | undefined;
  let throughputBackoffOverride: ApexThroughputBackoffPolicy | undefined;
  const externalSignalsPaths: string[] = [];
  const benchmarkSignalsPaths: string[] = [];
  let artifactProfile: MachineArtifactProfile = "lean";
  let machineTokenBudgetOverride: number | undefined;
  let perfIncludeYellow: boolean | undefined;
  const serveOptions: OrchestratorServeOptions = createOrchestratorServeDefaults();
  let labAuth = false;
  for (let i = 2; i < argv.length; i += 1) {
    const arg: string = argv[i];
    const serveSkip = applyOrchestratorServeFlag(arg, argv, i, serveOptions);
    if (serveSkip >= 0) {
      i += serveSkip;
      continue;
    }
    if (arg === "--lab-auth") {
      labAuth = true;
      continue;
    }
    if ((arg === "--config" || arg === "-c") && i + 1 < argv.length) {
      configPath = argv[i + 1];
      i += 1;
    } else if (arg === "--ci") {
      ci = true;
    } else if (arg === "--fail-on-budget") {
      failOnBudget = true;
    } else if (arg === "--fail-on-quality-gate") {
      failOnQualityGate = true;
    } else if (arg === "--fail-on-baseline-compare") {
      failOnBaselineCompare = true;
    } else if (arg === "--no-color") {
      colorMode = "never";
    } else if (arg === "--color") {
      colorMode = "always";
    } else if (arg === "--log-level" && i + 1 < argv.length) {
      const value: string = argv[i + 1];
      if (value === "silent" || value === "error" || value === "info" || value === "verbose") {
        logLevelOverride = value;
      } else {
        throw new Error(`Unknown argument: ${arg}`);
      }
      i += 1;
    } else if (arg === "--mobile-only") {
      if (deviceFilter !== undefined && deviceFilter !== "mobile") {
        throw new Error("Cannot combine --mobile-only and --desktop-only");
      }
      deviceFilter = "mobile";
    } else if (arg === "--desktop-only") {
      if (deviceFilter !== undefined && deviceFilter !== "desktop") {
        throw new Error("Cannot combine --mobile-only and --desktop-only");
      }
      deviceFilter = "desktop";
    } else if (arg === "--throttling" && i + 1 < argv.length) {
      const value: string = argv[i + 1];
      if (value === "simulate" || value === "devtools") {
        throttlingMethodOverride = value;
      } else {
        throw new Error(`Invalid --throttling value: ${value}. Expected "simulate" or "devtools".`);
      }
      i += 1;
    } else if (arg === "--cpu-slowdown" && i + 1 < argv.length) {
      const value: number = parseFloat(argv[i + 1]);
      if (Number.isNaN(value) || value <= 0 || value > 20) {
        throw new Error(`Invalid --cpu-slowdown value: ${argv[i + 1]}. Expected number between 0 and 20.`);
      }
      cpuSlowdownOverride = value;
      i += 1;
    } else if (arg === "--parallel" && i + 1 < argv.length) {
      const value: number = parseInt(argv[i + 1], 10);
      if (Number.isNaN(value) || value < 1 || value > 10) {
        throw new Error(`Invalid --parallel value: ${argv[i + 1]}. Expected integer between 1 and 10.`);
      }
      parallelOverride = value;
      i += 1;
    } else if (arg === "--audit-timeout-ms" && i + 1 < argv.length) {
      const value: number = parseInt(argv[i + 1], 10);
      if (Number.isNaN(value) || value <= 0) {
        throw new Error(`Invalid --audit-timeout-ms value: ${argv[i + 1]}. Expected a positive integer (milliseconds).`);
      }
      auditTimeoutMsOverride = value;
      i += 1;
    } else if (arg === "--diagnostics") {
      diagnostics = true;
    } else if (arg === "--lhr") {
      lhr = true;
    } else if (arg === "--plan") {
      plan = true;
    } else if (arg === "--flags") {
      flagsOnly = true;
    } else if (arg === "--regressions-only") {
      regressionsOnly = true;
    } else if (arg === "--changed-only") {
      changedOnly = true;
    } else if (arg === "--rerun-failing") {
      rerunFailing = true;
    } else if (arg === "--focus-worst" && i + 1 < argv.length) {
      const value: number = parseInt(argv[i + 1], 10);
      if (Number.isNaN(value) || value <= 0 || value > 200) {
        throw new Error(`Invalid --focus-worst value: ${argv[i + 1]}. Expected integer between 1 and 200.`);
      }
      focusWorst = value;
      i += 1;
    } else if (arg === "--ai-min-combos" && i + 1 < argv.length) {
      const value: number = parseInt(argv[i + 1], 10);
      if (Number.isNaN(value) || value <= 0 || value > 200) {
        throw new Error(`Invalid --ai-min-combos value: ${argv[i + 1]}. Expected integer between 1 and 200.`);
      }
      aiMinCombos = value;
      i += 1;
    } else if (arg === "--no-ai-fix") {
      noAiFix = true;
    } else if (arg === "--no-export") {
      noExport = true;
    } else if (arg === "--accessibility-pass") {
      accessibilityPass = true;
    } else if (arg === "--webhook-url" && i + 1 < argv.length) {
      webhookUrl = argv[i + 1];
      i += 1;
    } else if (arg === "--webhook-always") {
      webhookAlways = true;
    } else if (arg === "--ci-platform" && i + 1 < argv.length) {
      const value = argv[i + 1];
      if (value === "github" || value === "gitlab" || value === "jenkins") {
        ciPlatform = value;
      } else {
        throw new Error(`Invalid --ci-platform value: ${value}. Expected "github", "gitlab", or "jenkins".`);
      }
      i += 1;
    } else if (arg === "--budget-webhook-url" && i + 1 < argv.length) {
      budgetWebhookUrl = argv[i + 1];
      if (!validateWebhookUrl(budgetWebhookUrl)) {
        throw new Error(`Invalid --budget-webhook-url: ${budgetWebhookUrl}. Must be a valid HTTP or HTTPS URL.`);
      }
      i += 1;
    } else if (arg === "--budget-webhook-retries" && i + 1 < argv.length) {
      const value = parseInt(argv[i + 1], 10);
      if (Number.isNaN(value) || value < 0 || value > 10) {
        throw new Error(`Invalid --budget-webhook-retries value: ${argv[i + 1]}. Expected integer between 0 and 10.`);
      }
      budgetWebhookRetries = value;
      i += 1;
    } else if (arg === "--max-steps" && i + 1 < argv.length) {
      const value: number = parseInt(argv[i + 1], 10);
      if (Number.isNaN(value) || value <= 0) {
        throw new Error(`Invalid --max-steps value: ${argv[i + 1]}. Expected a positive integer.`);
      }
      maxSteps = value;
      i += 1;
    } else if (arg === "--max-combos" && i + 1 < argv.length) {
      const value: number = parseInt(argv[i + 1], 10);
      if (Number.isNaN(value) || value <= 0) {
        throw new Error(`Invalid --max-combos value: ${argv[i + 1]}. Expected a positive integer.`);
      }
      maxCombos = value;
      i += 1;
    } else if (arg === "--yes" || arg === "-y") {
      yes = true;
    } else if (arg.startsWith("--parallel=")) {
      parallelOverride = Number(arg.split("=")[1]);
      if (Number.isNaN(parallelOverride)) {
        parallelOverride = undefined;
      }
    } else if (arg === "--stable") {
      stable = true;
    } else if (arg === "--open" || arg === "--open-report") {
      openReport = true;
    } else if (arg === "--warm-up") {
      warmUp = true;
    } else if (arg === "--incremental") {
      incremental = true;
    } else if (arg === "--incremental-skip") {
      incrementalSkipPassing = true;
    } else if (arg === "--build-id" && i + 1 < argv.length) {
      buildId = argv[i + 1];
      i += 1;
    } else if (arg === "--runs" && i + 1 < argv.length) {
      const value: number = parseInt(argv[i + 1], 10);
      if (Number.isNaN(value) || value !== 1) {
        throw new Error(
          `Multi-run mode is no longer supported. Received --runs ${argv[i + 1]}. Run the same command multiple times instead (more stable).`,
        );
      }
      runsOverride = value;
      i += 1;
    } else if (arg === "--overview-combos" && i + 1 < argv.length) {
      const value: number = parseInt(argv[i + 1], 10);
      if (Number.isNaN(value) || value <= 0 || value > 200) {
        throw new Error(`Invalid --overview-combos value: ${argv[i + 1]}. Expected integer between 1 and 200.`);
      }
      overviewCombos = value;
      i += 1;
    } else if (arg === "--quick") {
      quick = true;
    } else if (arg === "--accurate") {
      accurate = true;
    } else if (arg === "--devtools-accurate") {
      devtoolsAccurate = true;
    } else if (arg === "--json") {
      jsonOutput = true;
    } else if (arg === "--show-parallel") {
      showParallel = true;
    } else if (arg === "--fast") {
      fast = true;
    } else if (arg === "--overview") {
      overview = true;
    } else if (arg === "--mode" && i + 1 < argv.length) {
      const value: string = argv[i + 1];
      if (value === "fidelity" || value === "throughput") mode = value;
      else throw new Error(`Invalid --mode value: ${value}. Expected "fidelity" or "throughput".`);
      i += 1;
    } else if (arg === "--parity") {
      parity = true;
    } else if (arg === "--throughput-backoff" && i + 1 < argv.length) {
      const value: string = argv[i + 1];
      if (value === "auto" || value === "aggressive" || value === "off") {
        throughputBackoffOverride = value;
      } else {
        throw new Error(`Invalid --throughput-backoff value: ${value}. Expected "auto", "aggressive", or "off".`);
      }
      i += 1;
    } else if (arg.startsWith("--throughput-backoff=")) {
      const value: string = arg.split("=")[1] ?? "";
      if (value === "auto" || value === "aggressive" || value === "off") {
        throughputBackoffOverride = value;
      } else {
        throw new Error(`Invalid --throughput-backoff value: ${value}. Expected "auto", "aggressive", or "off".`);
      }
    } else if (arg === "--isolation" && i + 1 < argv.length) {
      const value: string = argv[i + 1];
      if (value === "shared" || value === "per-audit" || value === "browser") {
        isolationOverride = value;
      } else {
        throw new Error(`Invalid --isolation value: ${value}. Expected "shared", "per-audit", or "browser".`);
      }
      i += 1;
    } else if (arg.startsWith("--isolation=")) {
      const value: string = arg.split("=")[1] ?? "";
      if (value === "shared" || value === "per-audit" || value === "browser") {
        isolationOverride = value;
      } else {
        throw new Error(`Invalid --isolation value: ${value}. Expected "shared", "per-audit", or "browser".`);
      }
    } else if (arg === "--contract" && i + 1 < argv.length) {
      const value: string = argv[i + 1];
      if (value === "legacy" || value === "v3") contractVersion = value;
      else throw new Error(`Invalid --contract value: ${value}. Expected "legacy" or "v3".`);
      i += 1;
    } else if (arg === "--legacy-artifacts") {
      legacyArtifacts = true;
    } else if (arg === "--baseline" && i + 1 < argv.length) {
      baselinePath = argv[i + 1];
      i += 1;
    } else if (arg === "--perf-include-yellow") {
      perfIncludeYellow = true;
    } else if (arg === "--no-perf-include-yellow") {
      perfIncludeYellow = false;
    } else if (arg === "--artifact-profile" && i + 1 < argv.length) {
      const value: string = argv[i + 1] ?? "";
      if (value === "lean" || value === "standard" || value === "diagnostics") {
        artifactProfile = value;
      } else {
        throw new Error(`Invalid --artifact-profile value: ${value}. Expected "lean", "standard", or "diagnostics".`);
      }
      i += 1;
    } else if (arg === "--machine-token-budget" && i + 1 < argv.length) {
      const value: number = parseInt(argv[i + 1], 10);
      if (Number.isNaN(value) || value < 2000) {
        throw new Error(`Invalid --machine-token-budget value: ${argv[i + 1]}. Expected integer >= 2000.`);
      }
      machineTokenBudgetOverride = value;
      i += 1;
    } else if (arg === "--external-signals" && i + 1 < argv.length) {
      externalSignalsPaths.push(resolve(argv[i + 1]));
      i += 1;
    } else if (arg.startsWith("--external-signals=")) {
      const value: string = arg.split("=")[1] ?? "";
      if (value.length === 0) {
        throw new Error("Invalid --external-signals value: expected a file path.");
      }
      externalSignalsPaths.push(resolve(value));
    } else if (arg === "--benchmark-signals" && i + 1 < argv.length) {
      benchmarkSignalsPaths.push(resolve(argv[i + 1]));
      i += 1;
    } else if (arg.startsWith("--benchmark-signals=")) {
      const value: string = arg.split("=")[1] ?? "";
      if (value.length === 0) {
        throw new Error("Invalid --benchmark-signals value: expected a file path.");
      }
      benchmarkSignalsPaths.push(resolve(value));
    }
  }
  const presetCount: number = [fast, quick, accurate, devtoolsAccurate, overview, parity].filter((flag) => flag).length;
  if (presetCount > 1) {
    throw new Error("Choose only one preset: --overview, --fast, --quick, --accurate, --devtools-accurate, or --parity");
  }
  if (lhr) {
    diagnostics = true;
  }
  const finalConfigPath: string = configPath ?? "signaler.config.json";
  return {
    configPath: finalConfigPath,
    ci,
    failOnBudget,
    failOnQualityGate,
    failOnBaselineCompare,
    colorMode,
    logLevelOverride,
    deviceFilter,
    throttlingMethodOverride,
    cpuSlowdownOverride,
    parallelOverride,
    auditTimeoutMsOverride,
    diagnostics,
    lhr,
    plan,
    flagsOnly,
    yes,
    maxSteps,
    maxCombos,
    stable,
    openReport,
    warmUp,
    incremental,
    incrementalSkipPassing,
    buildId,
    runsOverride,
    quick,
    accurate,
    devtoolsAccurate,
    jsonOutput,
    showParallel,
    fast,
    overview,
    overviewCombos,
    regressionsOnly,
    changedOnly,
    rerunFailing,
    focusWorst,
    aiMinCombos,
    noAiFix,
    noExport,
    accessibilityPass,
    webhookUrl,
    webhookAlways,
    ciPlatform,
    budgetWebhookUrl,
    budgetWebhookRetries,
    mode,
    parity,
    contractVersion,
    legacyArtifacts,
    baselinePath,
    isolationOverride,
    throughputBackoffOverride,
    externalSignalsPaths,
    benchmarkSignalsPaths,
    artifactProfile,
    machineTokenBudgetOverride,
    perfIncludeYellow,
    managedServe: serveOptions.managedServe,
    managedServeMode: serveOptions.managedServeMode,
    managedServeSkipBuild: serveOptions.managedServeSkipBuild,
    managedServeReuse: serveOptions.managedServeReuse,
    serveEnvOverrides: serveOptions.serveEnvOverrides,
    labAuth,
    noAuditBypass: serveOptions.noAuditBypass,
    serveOptions,
  };
}
