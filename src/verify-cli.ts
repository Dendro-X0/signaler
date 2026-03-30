import { mkdir, readFile, stat, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import type { ApexConfig, ApexDevice, ApexPageConfig } from "./core/types.js";
import { runAuditCli } from "./cli.js";
import { loadConfig } from "./core/config.js";
import type { ResultsV3, ResultsV3Line } from "./contracts/v3/results-v3.js";
import { isResultsV3 } from "./contracts/v3/validators.js";
import type { AnalyzeActionV6, AnalyzeReportV6 } from "./contracts/v6/analyze-v6.js";
import type { VerifyCheckV6, VerifyReportV6, VerifyThresholdsV6 } from "./contracts/v6/verify-v6.js";
import { isAnalyzeReportV6, isVerifyReportV6, isVerifyThresholdsV6 } from "./contracts/v6/validators.js";

type VerifyExitCode = 0 | 1 | 2 | 3;

type VerifyArgs = {
  readonly contract?: string;
  readonly dir: string;
  readonly from: string;
  readonly actionIds?: readonly string[];
  readonly topActions: number;
  readonly verifyMode: "fidelity" | "throughput";
  readonly maxRoutes: number;
  readonly runtimeBudgetMs?: number;
  readonly strictComparability: boolean;
  readonly allowComparabilityMismatch: boolean;
  readonly passThresholdsPath?: string;
  readonly dryRun: boolean;
  readonly json: boolean;
};

type BaselineRunInput = {
  readonly protocol: {
    readonly mode: "fidelity" | "throughput";
    readonly comparabilityHash: string;
  };
  readonly meta: {
    readonly configPath: string;
    readonly averageStepMs?: number;
  };
};

type ComboRef = {
  readonly path: string;
  readonly device: ApexDevice;
};

type VerifyRoutePlan = {
  readonly candidateRoutes: readonly string[];
  readonly selectedRoutes: readonly string[];
  readonly estimatedStepMs: number;
  readonly estimatedRuntimeMsBeforeBudget: number;
  readonly estimatedRuntimeMsAfterBudget: number;
  readonly plannedCombosBeforeBudget: number;
  readonly plannedCombosAfterBudget: number;
  readonly budgetApplied: boolean;
  readonly budgetTrimmed: boolean;
  readonly budgetMs?: number;
};

const DEFAULT_THRESHOLDS: Required<VerifyThresholdsV6> = {
  minScoreDelta: 1,
  minLcpDeltaMs: 100,
  minTbtDeltaMs: 25,
  minClsDelta: 0.01,
  minBytesDelta: 1024,
};
const DEFAULT_VERIFY_STEP_ESTIMATE_MS = 12_000;

function parseIntegerFlag(params: { readonly name: string; readonly value: string; readonly min: number; readonly max?: number }): number {
  const parsed: number = Number.parseInt(params.value, 10);
  if (!Number.isFinite(parsed) || parsed < params.min || (typeof params.max === "number" && parsed > params.max)) {
    const bounds = typeof params.max === "number" ? `${params.min}..${params.max}` : `>= ${params.min}`;
    throw new Error(`Invalid ${params.name} value: ${params.value}. Expected integer ${bounds}.`);
  }
  return parsed;
}

function parseActionIds(value: string): readonly string[] {
  const ids: readonly string[] = value
    .split(",")
    .map((item) => item.trim())
    .filter((item) => item.length > 0);
  return [...new Set(ids)];
}

function parseArgs(argv: readonly string[]): VerifyArgs {
  let contract: string | undefined;
  let dir: string = resolve(".signaler");
  let from: string = resolve(".signaler", "analyze.json");
  let actionIds: readonly string[] | undefined;
  let topActions = 1;
  let verifyMode: "fidelity" | "throughput" = "fidelity";
  let maxRoutes = 10;
  let runtimeBudgetMs: number | undefined;
  let strictComparability = false;
  let allowComparabilityMismatch = false;
  let passThresholdsPath: string | undefined;
  let dryRun = false;
  let json = false;

  for (let index = 2; index < argv.length; index += 1) {
    const arg: string = argv[index] ?? "";
    if ((arg === "--dir" || arg === "--output-dir") && index + 1 < argv.length) {
      dir = resolve(argv[index + 1] ?? dir);
      index += 1;
      continue;
    }
    if (arg === "--from" && index + 1 < argv.length) {
      from = resolve(argv[index + 1] ?? from);
      index += 1;
      continue;
    }
    if (arg === "--action-ids" && index + 1 < argv.length) {
      actionIds = parseActionIds(argv[index + 1] ?? "");
      index += 1;
      continue;
    }
    if (arg === "--top-actions" && index + 1 < argv.length) {
      topActions = parseIntegerFlag({ name: "--top-actions", value: argv[index + 1] ?? "", min: 1, max: 100 });
      index += 1;
      continue;
    }
    if (arg === "--verify-mode" && index + 1 < argv.length) {
      const value = argv[index + 1];
      if (value !== "fidelity" && value !== "throughput") {
        throw new Error(`Invalid --verify-mode value: ${value}. Expected fidelity|throughput.`);
      }
      verifyMode = value;
      index += 1;
      continue;
    }
    if (arg === "--max-routes" && index + 1 < argv.length) {
      maxRoutes = parseIntegerFlag({ name: "--max-routes", value: argv[index + 1] ?? "", min: 1, max: 50 });
      index += 1;
      continue;
    }
    if (arg === "--runtime-budget-ms" && index + 1 < argv.length) {
      runtimeBudgetMs = parseIntegerFlag({ name: "--runtime-budget-ms", value: argv[index + 1] ?? "", min: 1000 });
      index += 1;
      continue;
    }
    if (arg.startsWith("--runtime-budget-ms=")) {
      const value: string = arg.split("=")[1] ?? "";
      runtimeBudgetMs = parseIntegerFlag({ name: "--runtime-budget-ms", value, min: 1000 });
      continue;
    }
    if (arg === "--strict-comparability") {
      strictComparability = true;
      continue;
    }
    if (arg === "--allow-comparability-mismatch") {
      allowComparabilityMismatch = true;
      continue;
    }
    if (arg === "--pass-thresholds" && index + 1 < argv.length) {
      passThresholdsPath = resolve(argv[index + 1] ?? "");
      index += 1;
      continue;
    }
    if (arg === "--dry-run") {
      dryRun = true;
      continue;
    }
    if (arg === "--json") {
      json = true;
      continue;
    }
    if (arg === "--contract" && index + 1 < argv.length) {
      contract = argv[index + 1];
      index += 1;
      continue;
    }
  }

  return {
    contract,
    dir,
    from,
    actionIds,
    topActions,
    verifyMode,
    maxRoutes,
    runtimeBudgetMs,
    strictComparability,
    allowComparabilityMismatch,
    passThresholdsPath,
    dryRun,
    json,
  };
}

function normalizePathForReport(value: string): string {
  return value.replace(/\\/g, "/");
}

function normalizeText(value: string): string {
  return value.trim().toLowerCase().replace(/\s+/g, " ");
}

function createVerifyRunId(): string {
  const stamp: string = new Date().toISOString().replace(/[-:]/g, "").replace(/\.\d+Z$/, "Z");
  const rand: string = Math.random().toString(36).slice(2, 8);
  return `verify-${stamp}-${rand}`;
}

async function fileExists(path: string): Promise<boolean> {
  try {
    await stat(path);
    return true;
  } catch {
    return false;
  }
}

async function readJson(path: string): Promise<unknown> {
  const raw: string = await readFile(path, "utf8");
  return JSON.parse(raw) as unknown;
}

function isBaselineRunInput(value: unknown): value is BaselineRunInput {
  if (!value || typeof value !== "object") return false;
  const root = value as { readonly protocol?: unknown; readonly meta?: unknown };
  if (!root.protocol || typeof root.protocol !== "object") return false;
  if (!root.meta || typeof root.meta !== "object") return false;
  const protocol = root.protocol as { readonly mode?: unknown; readonly comparabilityHash?: unknown };
  const meta = root.meta as { readonly configPath?: unknown; readonly averageStepMs?: unknown };
  if (protocol.mode !== "fidelity" && protocol.mode !== "throughput") return false;
  if (typeof protocol.comparabilityHash !== "string" || protocol.comparabilityHash.length === 0) return false;
  if (typeof meta.configPath !== "string" || meta.configPath.length === 0) return false;
  if (meta.averageStepMs !== undefined && (typeof meta.averageStepMs !== "number" || !Number.isFinite(meta.averageStepMs) || meta.averageStepMs <= 0)) {
    return false;
  }
  return true;
}

function parseIssueIdFromSuggestion(sourceSuggestionId: string | undefined): string | undefined {
  if (typeof sourceSuggestionId !== "string" || sourceSuggestionId.length === 0) return undefined;
  const matched: RegExpMatchArray | null = sourceSuggestionId.match(/^sugg-(.+)-\d+$/);
  if (!matched || matched.length < 2) return undefined;
  return matched[1];
}

function median(values: readonly number[]): number | undefined {
  if (values.length === 0) return undefined;
  const sorted: number[] = [...values].sort((a, b) => a - b);
  const middle: number = Math.floor(sorted.length / 2);
  if (sorted.length % 2 === 0) {
    return (sorted[middle - 1] + sorted[middle]) / 2;
  }
  return sorted[middle];
}

function metricMedian<T>(rows: readonly T[], mapper: (row: T) => number | undefined): number | undefined {
  const values: number[] = [];
  for (const row of rows) {
    const value: number | undefined = mapper(row);
    if (typeof value === "number") {
      values.push(value);
    }
  }
  return median(values);
}

function inferActionCombos(action: AnalyzeActionV6): readonly ComboRef[] {
  const direct: ComboRef[] = action.affectedCombos.map((combo) => ({ path: combo.path, device: combo.device }));
  if (direct.length > 0) {
    const seen = new Set<string>();
    const ordered: ComboRef[] = [];
    for (const combo of direct) {
      const key: string = `${combo.path}|${combo.device}`;
      if (!seen.has(key)) {
        seen.add(key);
        ordered.push(combo);
      }
    }
    return ordered;
  }
  const fallback = action.verifyPlan.targetRoutes.map((route) => ({ path: route, device: "mobile" as const }));
  return fallback;
}

function collectCandidateRoutes(actions: readonly AnalyzeActionV6[]): readonly string[] {
  const ordered = new Set<string>();
  for (const action of actions) {
    const candidates = action.verifyPlan.targetRoutes.length > 0
      ? action.verifyPlan.targetRoutes
      : action.affectedCombos.map((combo) => combo.path);
    for (const route of candidates) {
      if (!ordered.has(route)) {
        ordered.add(route);
      }
    }
  }
  return [...ordered];
}

function estimateRouteCombos(params: {
  readonly route: string;
  readonly desiredDevicesByPath: ReadonlyMap<string, ReadonlySet<ApexDevice>>;
  readonly existingPageByPath: ReadonlyMap<string, ApexPageConfig>;
}): number {
  const desiredDevices: ReadonlySet<ApexDevice> | undefined = params.desiredDevicesByPath.get(params.route);
  const existing: ApexPageConfig | undefined = params.existingPageByPath.get(params.route);
  if (existing !== undefined) {
    if (desiredDevices !== undefined && desiredDevices.size > 0) {
      const intersection = existing.devices.filter((device) => desiredDevices.has(device)).length;
      return Math.max(1, intersection);
    }
    return Math.max(1, existing.devices.length);
  }
  if (desiredDevices !== undefined && desiredDevices.size > 0) {
    return Math.max(1, desiredDevices.size);
  }
  return 2;
}

function buildVerifyRoutePlan(params: {
  readonly candidateRoutes: readonly string[];
  readonly desiredDevicesByPath: ReadonlyMap<string, ReadonlySet<ApexDevice>>;
  readonly existingPageByPath: ReadonlyMap<string, ApexPageConfig>;
  readonly estimatedStepMs: number;
  readonly runtimeBudgetMs?: number;
}): VerifyRoutePlan {
  const routeCost = (route: string): number => {
    return estimateRouteCombos({
      route,
      desiredDevicesByPath: params.desiredDevicesByPath,
      existingPageByPath: params.existingPageByPath,
    }) * params.estimatedStepMs;
  };

  const estimatedRuntimeMsBeforeBudget: number = params.candidateRoutes.reduce((acc, route) => acc + routeCost(route), 0);
  const plannedCombosBeforeBudget: number = params.candidateRoutes.reduce(
    (acc, route) => acc + estimateRouteCombos({ route, desiredDevicesByPath: params.desiredDevicesByPath, existingPageByPath: params.existingPageByPath }),
    0,
  );

  const budgetApplied: boolean = typeof params.runtimeBudgetMs === "number";
  if (!budgetApplied) {
    return {
      candidateRoutes: params.candidateRoutes,
      selectedRoutes: params.candidateRoutes,
      estimatedStepMs: params.estimatedStepMs,
      estimatedRuntimeMsBeforeBudget,
      estimatedRuntimeMsAfterBudget: estimatedRuntimeMsBeforeBudget,
      plannedCombosBeforeBudget,
      plannedCombosAfterBudget: plannedCombosBeforeBudget,
      budgetApplied: false,
      budgetTrimmed: false,
    };
  }

  const budgetMs: number = params.runtimeBudgetMs!;
  const selectedRoutes: string[] = [];
  let estimatedRuntimeMsAfterBudget = 0;
  let plannedCombosAfterBudget = 0;
  for (const route of params.candidateRoutes) {
    const combos: number = estimateRouteCombos({ route, desiredDevicesByPath: params.desiredDevicesByPath, existingPageByPath: params.existingPageByPath });
    const routeCostMs: number = combos * params.estimatedStepMs;
    if (selectedRoutes.length === 0) {
      selectedRoutes.push(route);
      estimatedRuntimeMsAfterBudget += routeCostMs;
      plannedCombosAfterBudget += combos;
      continue;
    }
    if (estimatedRuntimeMsAfterBudget + routeCostMs > budgetMs) {
      continue;
    }
    selectedRoutes.push(route);
    estimatedRuntimeMsAfterBudget += routeCostMs;
    plannedCombosAfterBudget += combos;
  }

  return {
    candidateRoutes: params.candidateRoutes,
    selectedRoutes,
    estimatedStepMs: params.estimatedStepMs,
    estimatedRuntimeMsBeforeBudget,
    estimatedRuntimeMsAfterBudget,
    plannedCombosBeforeBudget,
    plannedCombosAfterBudget,
    budgetApplied: true,
    budgetTrimmed: selectedRoutes.length < params.candidateRoutes.length,
    budgetMs,
  };
}

function sumOpportunityBytes(params: {
  readonly rows: readonly ResultsV3Line[];
  readonly issueId?: string;
  readonly title: string;
}): number | undefined {
  let total = 0;
  let seen = false;
  const titleNorm: string = normalizeText(params.title);
  for (const row of params.rows) {
    for (const opportunity of row.opportunities) {
      const matchedIssue: boolean =
        (typeof params.issueId === "string" && opportunity.id === params.issueId)
        || normalizeText(opportunity.title) === titleNorm;
      if (!matchedIssue) continue;
      if (typeof opportunity.estimatedSavingsBytes === "number") {
        total += opportunity.estimatedSavingsBytes;
        seen = true;
      }
    }
  }
  return seen ? total : undefined;
}

function resolveThresholds(input: VerifyThresholdsV6 | undefined): Required<VerifyThresholdsV6> {
  return {
    minScoreDelta: input?.minScoreDelta ?? DEFAULT_THRESHOLDS.minScoreDelta,
    minLcpDeltaMs: input?.minLcpDeltaMs ?? DEFAULT_THRESHOLDS.minLcpDeltaMs,
    minTbtDeltaMs: input?.minTbtDeltaMs ?? DEFAULT_THRESHOLDS.minTbtDeltaMs,
    minClsDelta: input?.minClsDelta ?? DEFAULT_THRESHOLDS.minClsDelta,
    minBytesDelta: input?.minBytesDelta ?? DEFAULT_THRESHOLDS.minBytesDelta,
  };
}

function compareMetric(params: {
  readonly metric: "score" | "lcpMs" | "tbtMs" | "cls" | "bytes";
  readonly delta: number | undefined;
  readonly thresholds: Required<VerifyThresholdsV6>;
}): { readonly comparable: boolean; readonly improved: boolean; readonly regressed: boolean } {
  if (typeof params.delta !== "number") {
    return { comparable: false, improved: false, regressed: false };
  }
  if (params.metric === "score") {
    return {
      comparable: true,
      improved: params.delta >= params.thresholds.minScoreDelta,
      regressed: params.delta <= -params.thresholds.minScoreDelta,
    };
  }
  if (params.metric === "lcpMs") {
    return {
      comparable: true,
      improved: params.delta <= -params.thresholds.minLcpDeltaMs,
      regressed: params.delta >= params.thresholds.minLcpDeltaMs,
    };
  }
  if (params.metric === "tbtMs") {
    return {
      comparable: true,
      improved: params.delta <= -params.thresholds.minTbtDeltaMs,
      regressed: params.delta >= params.thresholds.minTbtDeltaMs,
    };
  }
  if (params.metric === "cls") {
    return {
      comparable: true,
      improved: params.delta <= -params.thresholds.minClsDelta,
      regressed: params.delta >= params.thresholds.minClsDelta,
    };
  }
  return {
    comparable: true,
    improved: params.delta <= -params.thresholds.minBytesDelta,
    regressed: params.delta >= params.thresholds.minBytesDelta,
  };
}

function formatVerifyMarkdown(report: VerifyReportV6): string {
  const lines: string[] = [];
  lines.push("# Signaler Verify Report");
  lines.push("");
  lines.push(`Generated: ${report.generatedAt}`);
  lines.push(`Verify Run ID: ${report.verifyRunId}`);
  lines.push(`Baseline mode/hash: ${report.baseline.mode} / ${report.baseline.comparabilityHash}`);
  lines.push(`Rerun mode/hash: ${report.rerun.mode} / ${report.rerun.comparabilityHash}`);
  lines.push(`Comparability matched: ${report.comparability.matched}`);
  if (report.comparability.reason) {
    lines.push(`Comparability note: ${report.comparability.reason}`);
  }
  lines.push("");
  lines.push("## Summary");
  lines.push("");
  lines.push(`- Total checks: ${report.summary.totalChecks}`);
  lines.push(`- Passed: ${report.summary.passed}`);
  lines.push(`- Failed: ${report.summary.failed}`);
  lines.push(`- Skipped: ${report.summary.skipped}`);
  lines.push(`- Status: ${report.summary.status}`);
  if (report.summary.warnings.length > 0) {
    lines.push("");
    lines.push("Warnings:");
    for (const warning of report.summary.warnings) {
      lines.push(`- ${warning}`);
    }
  }
  lines.push("");
  lines.push("## Checks");
  lines.push("");
  if (report.checks.length === 0) {
    lines.push("- No checks generated.");
  } else {
    for (const check of report.checks) {
      lines.push(`### ${check.actionTitle}`);
      lines.push("");
      lines.push(`- Action ID: ${check.actionId}`);
      lines.push(`- Status: ${check.status}`);
      if (check.reason) {
        lines.push(`- Reason: ${check.reason}`);
      }
      lines.push(`- Delta: score=${check.delta.score ?? "-"} lcpMs=${check.delta.lcpMs ?? "-"} tbtMs=${check.delta.tbtMs ?? "-"} cls=${check.delta.cls ?? "-"} bytes=${check.delta.bytes ?? "-"}`);
      lines.push("");
    }
  }
  return `${lines.join("\n")}\n`;
}

function printJsonSummary(params: {
  readonly report: VerifyReportV6;
  readonly elapsedMs: number;
  readonly plannedCombos: number;
  readonly executedCombos: number;
  readonly selectedActionIds: readonly string[];
  readonly candidateRoutes: readonly string[];
  readonly selectedRoutes: readonly string[];
  readonly estimatedRuntimeMs: number;
  readonly runtimeBudgetMs: number;
}): void {
  const report: VerifyReportV6 = params.report;
  const payload = {
    command: "verify",
    contract: "v6",
    status: report.summary.status,
    verifyRunId: report.verifyRunId,
    checks: report.summary.totalChecks,
    passed: report.summary.passed,
    failed: report.summary.failed,
    skipped: report.summary.skipped,
    elapsedMs: params.elapsedMs,
    plannedCombos: params.plannedCombos,
    executedCombos: params.executedCombos,
    selectedActionIds: params.selectedActionIds,
    candidateRoutes: params.candidateRoutes,
    selectedRoutes: params.selectedRoutes,
    estimatedRuntimeMs: params.estimatedRuntimeMs,
    runtimeBudgetMs: params.runtimeBudgetMs,
  };
  // eslint-disable-next-line no-console
  console.log(JSON.stringify(payload));
}

function printHumanSummary(report: VerifyReportV6): void {
  // eslint-disable-next-line no-console
  console.log(
    `Verify completed: ${report.summary.status.toUpperCase()} (${report.summary.passed} passed, ${report.summary.failed} failed, ${report.summary.skipped} skipped).`,
  );
  // eslint-disable-next-line no-console
  console.log("Outputs: .signaler/verify.json, .signaler/verify.md");
}

export async function runVerifyCli(argv: readonly string[]): Promise<void> {
  const exitCode: VerifyExitCode = await runVerifyCliInternal(argv).catch((error: unknown) => {
    // eslint-disable-next-line no-console
    console.error(error instanceof Error ? error.message : String(error));
    return 1;
  });
  process.exitCode = exitCode;
}

async function runVerifyCliInternal(argv: readonly string[]): Promise<VerifyExitCode> {
  const verifyStartedAtMs: number = Date.now();
  let args: VerifyArgs;
  try {
    args = parseArgs(argv);
  } catch (error: unknown) {
    // eslint-disable-next-line no-console
    console.error(error instanceof Error ? error.message : String(error));
    return 1;
  }

  if (args.contract !== "v6") {
    // eslint-disable-next-line no-console
    console.error("The verify command is gated to V6 in this phase. Run with: signaler verify --contract v6");
    return 1;
  }

  const warnings: string[] = [];
  const baselineRunPath: string = resolve(args.dir, "run.json");
  const baselineResultsPath: string = resolve(args.dir, "results.json");

  if (!(await fileExists(baselineRunPath))) {
    // eslint-disable-next-line no-console
    console.error(`Missing baseline artifact: ${baselineRunPath}`);
    return 1;
  }
  if (!(await fileExists(baselineResultsPath))) {
    // eslint-disable-next-line no-console
    console.error(`Missing baseline artifact: ${baselineResultsPath}`);
    return 1;
  }
  if (!(await fileExists(args.from))) {
    // eslint-disable-next-line no-console
    console.error(`Missing analyze artifact: ${args.from}`);
    return 1;
  }

  const rawBaselineRun: unknown = await readJson(baselineRunPath);
  if (!isBaselineRunInput(rawBaselineRun)) {
    // eslint-disable-next-line no-console
    console.error("Invalid baseline run.json for verify.");
    return 1;
  }
  const baselineRun: BaselineRunInput = rawBaselineRun;

  const rawBaselineResults: unknown = await readJson(baselineResultsPath);
  if (!isResultsV3(rawBaselineResults)) {
    // eslint-disable-next-line no-console
    console.error("Invalid baseline results.json for verify.");
    return 1;
  }
  const baselineResults: ResultsV3 = rawBaselineResults;

  const rawAnalyze: unknown = await readJson(args.from);
  if (!isAnalyzeReportV6(rawAnalyze)) {
    // eslint-disable-next-line no-console
    console.error("Invalid analyze.json for verify.");
    return 1;
  }
  const analyze: AnalyzeReportV6 = rawAnalyze;

  const thresholds = resolveThresholds(
    args.passThresholdsPath === undefined
      ? undefined
      : await (async () => {
        if (!(await fileExists(args.passThresholdsPath!))) {
          throw new Error(`Thresholds file not found: ${args.passThresholdsPath}`);
        }
        const raw = await readJson(args.passThresholdsPath!);
        if (!isVerifyThresholdsV6(raw)) {
          throw new Error(`Invalid thresholds JSON schema: ${args.passThresholdsPath}`);
        }
        return raw;
      })().catch((error: unknown) => {
        throw error instanceof Error ? error : new Error(String(error));
      }),
  );

  const actionById: Map<string, AnalyzeActionV6> = new Map(analyze.actions.map((action) => [action.id, action] as const));
  const selectedActions: AnalyzeActionV6[] = [];
  if (args.actionIds && args.actionIds.length > 0) {
    for (const actionId of args.actionIds) {
      const action = actionById.get(actionId);
      if (action) {
        selectedActions.push(action);
      } else {
        warnings.push(`Unknown action id ignored: ${actionId}`);
      }
    }
  } else {
    selectedActions.push(...analyze.actions.slice(0, args.topActions));
  }
  if (selectedActions.length === 0) {
    // eslint-disable-next-line no-console
    console.error("No verify actions selected.");
    return 1;
  }

  const desiredDevicesByPath: Map<string, Set<ApexDevice>> = new Map();
  for (const action of selectedActions) {
    for (const combo of action.affectedCombos) {
      if (!desiredDevicesByPath.has(combo.path)) {
        desiredDevicesByPath.set(combo.path, new Set<ApexDevice>());
      }
      desiredDevicesByPath.get(combo.path)!.add(combo.device);
    }
  }

  const verifyRunId: string = createVerifyRunId();
  const verifyRunDir: string = resolve(args.dir, "verify-runs", verifyRunId);
  await mkdir(verifyRunDir, { recursive: true });

  const loadedConfig = await loadConfig({ configPath: baselineRun.meta.configPath });
  const existingPageByPath: Map<string, ApexPageConfig> = new Map(loadedConfig.config.pages.map((page) => [page.path, page] as const));
  const candidateRoutes: readonly string[] = collectCandidateRoutes(selectedActions).slice(0, args.maxRoutes);
  if (candidateRoutes.length === 0) {
    // eslint-disable-next-line no-console
    console.error("No routes selected for verify run.");
    return 1;
  }
  const estimatedStepMs: number =
    typeof baselineRun.meta.averageStepMs === "number" && Number.isFinite(baselineRun.meta.averageStepMs) && baselineRun.meta.averageStepMs > 0
      ? baselineRun.meta.averageStepMs
      : DEFAULT_VERIFY_STEP_ESTIMATE_MS;
  if (typeof baselineRun.meta.averageStepMs !== "number") {
    warnings.push(`Baseline averageStepMs missing; runtime estimate used default ${DEFAULT_VERIFY_STEP_ESTIMATE_MS}ms per combo.`);
  }
  const routePlan: VerifyRoutePlan = buildVerifyRoutePlan({
    candidateRoutes,
    desiredDevicesByPath,
    existingPageByPath,
    estimatedStepMs,
    runtimeBudgetMs: args.runtimeBudgetMs,
  });
  const selectedRoutes: readonly string[] = routePlan.selectedRoutes;
  if (selectedRoutes.length === 0) {
    // eslint-disable-next-line no-console
    console.error("No routes selected for verify run.");
    return 1;
  }
  if (routePlan.budgetTrimmed) {
    warnings.push(
      `Route set trimmed by runtime budget: selected ${routePlan.selectedRoutes.length}/${routePlan.candidateRoutes.length} route(s) for budget ${routePlan.budgetMs}ms (estimated ${routePlan.estimatedRuntimeMsAfterBudget}ms).`,
    );
  }
  const filteredPages: ApexPageConfig[] = [];
  for (const route of selectedRoutes) {
    const existing: ApexPageConfig | undefined = existingPageByPath.get(route);
    const desiredDevices = desiredDevicesByPath.get(route);
    if (existing) {
      const mergedDevices = desiredDevices && desiredDevices.size > 0
        ? existing.devices.filter((device) => desiredDevices.has(device))
        : [...existing.devices];
      const devices: readonly ApexDevice[] = mergedDevices.length > 0
        ? mergedDevices
        : (desiredDevices && desiredDevices.size > 0 ? [...desiredDevices] : ["mobile", "desktop"]);
      filteredPages.push({
        path: existing.path,
        label: existing.label,
        devices,
        ...(existing.scope !== undefined ? { scope: existing.scope } : {}),
      });
    } else {
      const devices: readonly ApexDevice[] = desiredDevices && desiredDevices.size > 0 ? [...desiredDevices] : ["mobile", "desktop"];
      filteredPages.push({
        path: route,
        label: route,
        devices,
      });
    }
  }

  const verifyConfig: ApexConfig = {
    ...loadedConfig.config,
    pages: filteredPages,
  };
  const verifyConfigPath: string = resolve(verifyRunDir, "verify.config.json");
  await writeFile(verifyConfigPath, `${JSON.stringify(verifyConfig, null, 2)}\n`, "utf8");

  const selectedActionIds = new Set(selectedActions.map((action) => action.id));
  warnings.push(`Selected ${selectedActions.length} action(s) and ${selectedRoutes.length} route(s).`);
  if (args.actionIds && args.actionIds.length > 0 && selectedActionIds.size !== args.actionIds.length) {
    warnings.push("Some requested action IDs were not found and were skipped.");
  }

  let rerunComparabilityHash = "dry-run";
  let rerunResults: ResultsV3 | undefined;
  let rerunElapsedMs = 0;
  let comparabilityMatched = true;
  let comparabilityReason: string | undefined;

  if (!args.dryRun) {
    const runArgv: readonly string[] = [
      "node",
      "signaler",
      "--config",
      verifyConfigPath,
      "--dir",
      verifyRunDir,
      "--contract",
      "v3",
      "--mode",
      args.verifyMode,
      "--yes",
      "--no-ai-fix",
      "--no-export",
    ];
    process.exitCode = 0;
    const startedAtMs: number = Date.now();
    try {
      await runAuditCli(runArgv);
    } catch (error: unknown) {
      // eslint-disable-next-line no-console
      console.error(`Verify rerun failed: ${error instanceof Error ? error.message : String(error)}`);
      return 1;
    }
    rerunElapsedMs = Date.now() - startedAtMs;
    if ((process.exitCode ?? 0) !== 0) {
      // eslint-disable-next-line no-console
      console.error(`Verify rerun failed with exit code ${process.exitCode}.`);
      return 1;
    }
    const rerunRunPath = resolve(verifyRunDir, "run.json");
    const rerunResultsPath = resolve(verifyRunDir, "results.json");
    if (!(await fileExists(rerunRunPath)) || !(await fileExists(rerunResultsPath))) {
      // eslint-disable-next-line no-console
      console.error("Verify rerun did not emit required run.json/results.json.");
      return 1;
    }
    const rerunRunRaw: unknown = await readJson(rerunRunPath);
    if (!isBaselineRunInput(rerunRunRaw)) {
      // eslint-disable-next-line no-console
      console.error("Verify rerun produced invalid run.json.");
      return 1;
    }
    rerunComparabilityHash = rerunRunRaw.protocol.comparabilityHash;
    const rerunResultsRaw: unknown = await readJson(rerunResultsPath);
    if (!isResultsV3(rerunResultsRaw)) {
      // eslint-disable-next-line no-console
      console.error("Verify rerun produced invalid results.json.");
      return 1;
    }
    rerunResults = rerunResultsRaw;
    comparabilityMatched = baselineRun.protocol.comparabilityHash === rerunComparabilityHash;
    if (!comparabilityMatched) {
      comparabilityReason = `Comparability mismatch: baseline=${baselineRun.protocol.comparabilityHash}, rerun=${rerunComparabilityHash}`;
      warnings.push(comparabilityReason);
    }
  } else {
    comparabilityMatched = true;
    comparabilityReason = "Dry-run: rerun not executed.";
    warnings.push("Dry-run mode: verify checks were not executed against rerun data.");
  }

  const strictComparabilityEnabled: boolean = args.strictComparability && !args.allowComparabilityMismatch;
  const strictComparabilityBlocked: boolean = strictComparabilityEnabled && !comparabilityMatched;
  if (strictComparabilityBlocked) {
    warnings.push("Strict comparability is enabled and hashes differ; verification checks were skipped.");
  }

  const baselineKeyMap: Map<string, ResultsV3Line> = new Map(
    baselineResults.results.map((row) => [`${row.path}|${row.device}`, row] as const),
  );
  const rerunKeyMap: Map<string, ResultsV3Line> = new Map(
    (rerunResults?.results ?? []).map((row) => [`${row.path}|${row.device}`, row] as const),
  );

  const checks: VerifyCheckV6[] = [];
  for (const action of selectedActions) {
    const combos: readonly ComboRef[] = inferActionCombos(action);
    const beforeRows: ResultsV3Line[] = [];
    const afterRows: ResultsV3Line[] = [];
    for (const combo of combos) {
      const key: string = `${combo.path}|${combo.device}`;
      const beforeRow = baselineKeyMap.get(key);
      if (beforeRow) beforeRows.push(beforeRow);
      const afterRow = rerunKeyMap.get(key);
      if (afterRow) afterRows.push(afterRow);
    }

    const beforeScore = metricMedian(beforeRows, (row) => row.scores.performance);
    const beforeLcp = metricMedian(beforeRows, (row) => row.metrics.lcpMs);
    const beforeTbt = metricMedian(beforeRows, (row) => row.metrics.tbtMs);
    const beforeCls = metricMedian(beforeRows, (row) => row.metrics.cls);
    const issueId = parseIssueIdFromSuggestion(action.sourceSuggestionId);
    const beforeBytes = sumOpportunityBytes({ rows: beforeRows, issueId, title: action.title });

    const afterScore = metricMedian(afterRows, (row) => row.scores.performance);
    const afterLcp = metricMedian(afterRows, (row) => row.metrics.lcpMs);
    const afterTbt = metricMedian(afterRows, (row) => row.metrics.tbtMs);
    const afterCls = metricMedian(afterRows, (row) => row.metrics.cls);
    const afterBytes = sumOpportunityBytes({ rows: afterRows, issueId, title: action.title });

    const deltaScore = typeof beforeScore === "number" && typeof afterScore === "number" ? afterScore - beforeScore : undefined;
    const deltaLcp = typeof beforeLcp === "number" && typeof afterLcp === "number" ? afterLcp - beforeLcp : undefined;
    const deltaTbt = typeof beforeTbt === "number" && typeof afterTbt === "number" ? afterTbt - beforeTbt : undefined;
    const deltaCls = typeof beforeCls === "number" && typeof afterCls === "number" ? afterCls - beforeCls : undefined;
    const deltaBytes = typeof beforeBytes === "number" && typeof afterBytes === "number" ? afterBytes - beforeBytes : undefined;

    const expected = action.verifyPlan.expectedDirection;
    const expectedMetrics: readonly ("score" | "lcpMs" | "tbtMs" | "cls" | "bytes")[] = [
      ...(expected.score === "up" ? ["score"] as const : []),
      ...(expected.lcpMs === "down" ? ["lcpMs"] as const : []),
      ...(expected.tbtMs === "down" ? ["tbtMs"] as const : []),
      ...(expected.cls === "down" ? ["cls"] as const : []),
      ...(expected.bytes === "down" ? ["bytes"] as const : []),
    ];

    let reason: string | undefined;
    let status: VerifyCheckV6["status"] = "pass";

    if (args.dryRun) {
      status = "skipped";
      reason = "Dry-run: rerun not executed.";
    } else if (strictComparabilityBlocked) {
      status = "skipped";
      reason = "Skipped due to strict comparability mismatch.";
    } else if (beforeRows.length === 0 || afterRows.length === 0) {
      status = "skipped";
      reason = "Insufficient comparable combo data.";
    } else {
      let comparableCount = 0;
      let improved = false;
      let regressed = false;
      for (const metric of expectedMetrics) {
        const delta = metric === "score"
          ? deltaScore
          : metric === "lcpMs"
            ? deltaLcp
            : metric === "tbtMs"
              ? deltaTbt
              : metric === "cls"
                ? deltaCls
                : deltaBytes;
        const result = compareMetric({ metric, delta, thresholds });
        if (!result.comparable) continue;
        comparableCount += 1;
        improved = improved || result.improved;
        regressed = regressed || result.regressed;
      }
      if (comparableCount === 0) {
        status = "skipped";
        reason = "No comparable expected metrics available.";
      } else if (regressed) {
        status = "fail";
        reason = "One or more expected metrics regressed beyond threshold.";
      } else if (!improved) {
        status = "fail";
        reason = "No expected metric improved beyond threshold.";
      }
    }

    checks.push({
      actionId: action.id,
      actionTitle: action.title,
      status,
      ...(reason ? { reason } : {}),
      before: {
        ...(typeof beforeScore === "number" ? { score: beforeScore } : {}),
        ...(typeof beforeLcp === "number" ? { lcpMs: beforeLcp } : {}),
        ...(typeof beforeTbt === "number" ? { tbtMs: beforeTbt } : {}),
        ...(typeof beforeCls === "number" ? { cls: beforeCls } : {}),
        ...(typeof beforeBytes === "number" ? { bytes: beforeBytes } : {}),
      },
      after: {
        ...(typeof afterScore === "number" ? { score: afterScore } : {}),
        ...(typeof afterLcp === "number" ? { lcpMs: afterLcp } : {}),
        ...(typeof afterTbt === "number" ? { tbtMs: afterTbt } : {}),
        ...(typeof afterCls === "number" ? { cls: afterCls } : {}),
        ...(typeof afterBytes === "number" ? { bytes: afterBytes } : {}),
      },
      delta: {
        ...(typeof deltaScore === "number" ? { score: deltaScore } : {}),
        ...(typeof deltaLcp === "number" ? { lcpMs: deltaLcp } : {}),
        ...(typeof deltaTbt === "number" ? { tbtMs: deltaTbt } : {}),
        ...(typeof deltaCls === "number" ? { cls: deltaCls } : {}),
        ...(typeof deltaBytes === "number" ? { bytes: deltaBytes } : {}),
      },
      threshold: {
        minScoreDelta: thresholds.minScoreDelta,
        minLcpDeltaMs: thresholds.minLcpDeltaMs,
        minTbtDeltaMs: thresholds.minTbtDeltaMs,
        minClsDelta: thresholds.minClsDelta,
        minBytesDelta: thresholds.minBytesDelta,
      },
      evidence: action.evidence,
    });
  }

  const passed = checks.filter((check) => check.status === "pass").length;
  const failed = checks.filter((check) => check.status === "fail").length;
  const skipped = checks.filter((check) => check.status === "skipped").length;
  const summaryStatus: "pass" | "fail" = strictComparabilityBlocked
    ? "fail"
    : failed > 0
      ? "fail"
      : "pass";

  const report: VerifyReportV6 = {
    schemaVersion: 1,
    verifyRunId,
    generatedAt: new Date().toISOString(),
    baseline: {
      dir: normalizePathForReport(args.dir),
      comparabilityHash: baselineRun.protocol.comparabilityHash,
      mode: baselineRun.protocol.mode,
    },
    rerun: {
      dir: normalizePathForReport(verifyRunDir),
      comparabilityHash: rerunComparabilityHash,
      mode: args.verifyMode,
      elapsedMs: rerunElapsedMs,
    },
    comparability: {
      strict: args.strictComparability,
      matched: comparabilityMatched,
      ...(comparabilityReason ? { reason: comparabilityReason } : {}),
    },
    checks,
    summary: {
      totalChecks: checks.length,
      passed,
      failed,
      skipped,
      status: summaryStatus,
      warnings,
    },
  };

  if (!isVerifyReportV6(report)) {
    // eslint-disable-next-line no-console
    console.error("Internal contract error: verify.json failed v6 validation.");
    return 1;
  }

  const verifyJsonPath: string = resolve(args.dir, "verify.json");
  const verifyMdPath: string = resolve(args.dir, "verify.md");
  await mkdir(args.dir, { recursive: true });
  await writeFile(verifyJsonPath, `${JSON.stringify(report, null, 2)}\n`, "utf8");
  await writeFile(verifyMdPath, formatVerifyMarkdown(report), "utf8");

  const elapsedMs: number = Date.now() - verifyStartedAtMs;
  const executedCombos: number = args.dryRun ? 0 : (rerunResults?.results.length ?? 0);
  if (args.json) {
    printJsonSummary({
      report,
      elapsedMs,
      plannedCombos: routePlan.plannedCombosAfterBudget,
      executedCombos,
      selectedActionIds: selectedActions.map((action) => action.id),
      candidateRoutes: routePlan.candidateRoutes,
      selectedRoutes: routePlan.selectedRoutes,
      estimatedRuntimeMs: routePlan.estimatedRuntimeMsAfterBudget,
      runtimeBudgetMs: routePlan.budgetMs ?? routePlan.estimatedRuntimeMsBeforeBudget,
    });
  } else {
    printHumanSummary(report);
  }

  if (args.dryRun) {
    return 3;
  }
  if (strictComparabilityBlocked) {
    return 1;
  }
  if (summaryStatus === "fail") {
    return 2;
  }
  return 0;
}
