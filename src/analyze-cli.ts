import { readFile, stat, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import type { AgentIndexV3 } from "./contracts/v3/agent-index-v3.js";
import type { ResultsV3, ResultsV3Line } from "./contracts/v3/results-v3.js";
import type { SuggestionV3, SuggestionsV3 } from "./contracts/v3/suggestions-v3.js";
import { isAgentIndexV3, isResultsV3, isSuggestionsV3 } from "./contracts/v3/validators.js";
import type { AnalyzeActionV6, AnalyzeArtifactProfileV6, AnalyzeConfidenceV6, AnalyzeReportV6 } from "./contracts/v6/analyze-v6.js";
import { isAnalyzeReportV6 } from "./contracts/v6/validators.js";
import { getMachineProfileCaps } from "./machine-output-profile.js";
import {
  buildDefaultExternalSignalsMetadata,
  evaluateConservativeExternalSignals,
  extractIssueIdFromSuggestionId,
  loadExternalSignalsFromFiles,
  matchAcceptedExternalSignals,
} from "./external-signals.js";
import {
  buildDefaultMultiBenchmarkMetadata,
  evaluateConservativeMultiBenchmarkSignals,
} from "./multi-benchmark-signals.js";
import { loadMultiBenchmarkSignalsWithRust } from "./rust/multi-benchmark-adapter.js";
import { scoreMultiBenchmarkWithRust } from "./rust/multi-benchmark-scoring-adapter.js";

type AnalyzeExitCode = 0 | 1 | 2;

type AnalyzeArgs = {
  readonly dir: string;
  readonly artifactProfile: AnalyzeArtifactProfileV6;
  readonly topActions: number;
  readonly minConfidence: AnalyzeConfidenceV6;
  readonly tokenBudget: number;
  readonly externalSignalsPaths: readonly string[];
  readonly benchmarkSignalsPaths: readonly string[];
  readonly strict: boolean;
  readonly json: boolean;
  readonly contract?: string;
};

type AnalyzeRunInput = {
  readonly protocol?: {
    readonly mode?: "fidelity" | "throughput";
    readonly profile?: string;
    readonly comparabilityHash?: string;
  };
};

type CandidateAction = {
  readonly sourceSuggestionId: string;
  readonly title: string;
  readonly category: AnalyzeActionV6["category"];
  readonly priorityScore: number;
  readonly confidence: AnalyzeConfidenceV6;
  readonly estimatedImpact: AnalyzeActionV6["estimatedImpact"];
  readonly affectedCombos: AnalyzeActionV6["affectedCombos"];
  readonly evidence: AnalyzeActionV6["evidence"];
  readonly action: AnalyzeActionV6["action"];
  readonly verifyPlan: AnalyzeActionV6["verifyPlan"];
};

type CandidateDraft = {
  readonly sourceSuggestionId: string;
  readonly title: string;
  readonly category: AnalyzeActionV6["category"];
  readonly confidence: AnalyzeConfidenceV6;
  readonly estimatedImpact: AnalyzeActionV6["estimatedImpact"];
  readonly affectedCombos: AnalyzeActionV6["affectedCombos"];
  readonly baseEvidence: AnalyzeActionV6["evidence"];
  readonly action: AnalyzeActionV6["action"];
  readonly verifyPlan: AnalyzeActionV6["verifyPlan"];
  readonly basePriority: number;
  readonly externalBoost: {
    readonly totalBoost: number;
    readonly evidence: readonly AnalyzeActionV6["evidence"][number][];
  };
  readonly benchmarkQuery?: {
    readonly candidateId: string;
    readonly issueId: string;
    readonly allowedPaths?: readonly string[];
  };
};

class StrictValidationError extends Error {}

function parseIntegerFlag(params: { readonly name: string; readonly value: string; readonly min: number; readonly max?: number }): number {
  const parsed: number = Number.parseInt(params.value, 10);
  if (!Number.isFinite(parsed) || parsed < params.min || (typeof params.max === "number" && parsed > params.max)) {
    const bounds = typeof params.max === "number" ? `${params.min}..${params.max}` : `>= ${params.min}`;
    throw new Error(`Invalid ${params.name} value: ${params.value}. Expected integer ${bounds}.`);
  }
  return parsed;
}

function parseArgs(argv: readonly string[]): AnalyzeArgs {
  let dir: string = resolve(".signaler");
  let artifactProfile: AnalyzeArtifactProfileV6 = "lean";
  let topActions = 12;
  let minConfidence: AnalyzeConfidenceV6 = "medium";
  let tokenBudget: number | undefined;
  const externalSignalsPaths: string[] = [];
  const benchmarkSignalsPaths: string[] = [];
  let strict = false;
  let json = false;
  let contract: string | undefined;

  for (let i = 2; i < argv.length; i += 1) {
    const arg: string = argv[i] ?? "";
    if ((arg === "--dir" || arg === "--output-dir") && i + 1 < argv.length) {
      dir = resolve(argv[i + 1] ?? dir);
      i += 1;
      continue;
    }
    if (arg === "--artifact-profile" && i + 1 < argv.length) {
      const value: string = argv[i + 1] ?? "";
      if (value !== "lean" && value !== "standard" && value !== "diagnostics") {
        throw new Error(`Invalid --artifact-profile value: ${value}. Expected lean|standard|diagnostics.`);
      }
      artifactProfile = value;
      i += 1;
      continue;
    }
    if (arg === "--top-actions" && i + 1 < argv.length) {
      topActions = parseIntegerFlag({ name: "--top-actions", value: argv[i + 1] ?? "", min: 1, max: 100 });
      i += 1;
      continue;
    }
    if (arg === "--min-confidence" && i + 1 < argv.length) {
      const value: string = argv[i + 1] ?? "";
      if (value !== "high" && value !== "medium" && value !== "low") {
        throw new Error(`Invalid --min-confidence value: ${value}. Expected high|medium|low.`);
      }
      minConfidence = value;
      i += 1;
      continue;
    }
    if (arg === "--token-budget" && i + 1 < argv.length) {
      tokenBudget = parseIntegerFlag({ name: "--token-budget", value: argv[i + 1] ?? "", min: 2_000 });
      i += 1;
      continue;
    }
    if (arg === "--external-signals" && i + 1 < argv.length) {
      externalSignalsPaths.push(resolve(argv[i + 1] ?? ""));
      i += 1;
      continue;
    }
    if (arg.startsWith("--external-signals=")) {
      const value: string = arg.split("=")[1] ?? "";
      if (value.length === 0) {
        throw new Error("Invalid --external-signals value: expected a file path.");
      }
      externalSignalsPaths.push(resolve(value));
      continue;
    }
    if (arg === "--benchmark-signals" && i + 1 < argv.length) {
      benchmarkSignalsPaths.push(resolve(argv[i + 1] ?? ""));
      i += 1;
      continue;
    }
    if (arg.startsWith("--benchmark-signals=")) {
      const value: string = arg.split("=")[1] ?? "";
      if (value.length === 0) {
        throw new Error("Invalid --benchmark-signals value: expected a file path.");
      }
      benchmarkSignalsPaths.push(resolve(value));
      continue;
    }
    if (arg === "--strict") {
      strict = true;
      continue;
    }
    if (arg === "--json") {
      json = true;
      continue;
    }
    if (arg === "--contract" && i + 1 < argv.length) {
      contract = argv[i + 1];
      i += 1;
      continue;
    }
  }

  return {
    dir,
    artifactProfile,
    topActions,
    minConfidence,
    tokenBudget: tokenBudget ?? getMachineProfileCaps(artifactProfile).defaultTokenBudget,
    externalSignalsPaths,
    benchmarkSignalsPaths,
    strict,
    json,
    contract,
  };
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

function normalizeText(value: string): string {
  return value.trim().toLowerCase().replace(/\s+/g, " ");
}

function normalizePathForReport(value: string): string {
  return value.replace(/\\/g, "/");
}

function confidenceRank(value: AnalyzeConfidenceV6): number {
  if (value === "high") return 3;
  if (value === "medium") return 2;
  return 1;
}

function confidenceWeight(value: AnalyzeConfidenceV6): number {
  if (value === "high") return 1.0;
  if (value === "medium") return 0.7;
  return 0.4;
}

function isRunInput(value: unknown): value is AnalyzeRunInput {
  if (!value || typeof value !== "object") return false;
  const root = value as { readonly protocol?: unknown };
  if (!root.protocol || typeof root.protocol !== "object") return false;
  const protocol = root.protocol as { readonly mode?: unknown; readonly comparabilityHash?: unknown; readonly profile?: unknown };
  if (protocol.mode !== "fidelity" && protocol.mode !== "throughput") return false;
  if (typeof protocol.comparabilityHash !== "string" || protocol.comparabilityHash.length === 0) return false;
  if (typeof protocol.profile !== "string" || protocol.profile.length === 0) return false;
  return true;
}

function parseRunBestEffort(value: unknown): AnalyzeRunInput | undefined {
  if (!value || typeof value !== "object") return undefined;
  const root = value as { readonly protocol?: unknown };
  if (!root.protocol || typeof root.protocol !== "object") return undefined;
  const protocol = root.protocol as { readonly mode?: unknown; readonly comparabilityHash?: unknown; readonly profile?: unknown };
  if (protocol.mode !== "fidelity" && protocol.mode !== "throughput") return undefined;
  if (typeof protocol.comparabilityHash !== "string" || protocol.comparabilityHash.length === 0) return undefined;
  if (typeof protocol.profile !== "string" || protocol.profile.length === 0) return undefined;
  return { protocol: { mode: protocol.mode, comparabilityHash: protocol.comparabilityHash, profile: protocol.profile } };
}

function parseEvidenceRows(raw: unknown): AnalyzeActionV6["evidence"] {
  if (!Array.isArray(raw)) return [];
  const rows: AnalyzeActionV6["evidence"][number][] = [];
  for (const row of raw) {
    if (!row || typeof row !== "object") continue;
    const rec = row as { readonly sourceRelPath?: unknown; readonly pointer?: unknown; readonly artifactRelPath?: unknown };
    if (typeof rec.sourceRelPath !== "string" || rec.sourceRelPath.length === 0) continue;
    if (typeof rec.pointer !== "string" || rec.pointer.length === 0) continue;
    rows.push({
      sourceRelPath: rec.sourceRelPath,
      pointer: rec.pointer,
      ...(typeof rec.artifactRelPath === "string" && rec.artifactRelPath.length > 0 ? { artifactRelPath: rec.artifactRelPath } : {}),
    });
  }
  return rows;
}

function parseSuggestionBestEffort(raw: unknown): SuggestionV3 | undefined {
  if (!raw || typeof raw !== "object") return undefined;
  const rec = raw as Record<string, unknown>;
  if (typeof rec.id !== "string" || rec.id.length === 0) return undefined;
  if (typeof rec.title !== "string" || rec.title.length === 0) return undefined;
  if (rec.category !== "performance" && rec.category !== "accessibility" && rec.category !== "best-practices" && rec.category !== "seo" && rec.category !== "reliability") {
    return undefined;
  }
  if (typeof rec.priorityScore !== "number") return undefined;
  if (rec.confidence !== "high" && rec.confidence !== "medium" && rec.confidence !== "low") return undefined;
  if (!rec.estimatedImpact || typeof rec.estimatedImpact !== "object") return undefined;
  const estimatedImpact = rec.estimatedImpact as { readonly timeMs?: unknown; readonly bytes?: unknown; readonly affectedCombos?: unknown };
  if (typeof estimatedImpact.affectedCombos !== "number") return undefined;
  const evidence = parseEvidenceRows(rec.evidence);
  if (!rec.action || typeof rec.action !== "object") return undefined;
  const action = rec.action as { readonly summary?: unknown; readonly steps?: unknown; readonly effort?: unknown };
  if (typeof action.summary !== "string" || action.summary.length === 0) return undefined;
  if (!Array.isArray(action.steps)) return undefined;
  const steps: string[] = [];
  for (const step of action.steps) {
    if (typeof step === "string" && step.trim().length > 0) {
      steps.push(step.trim());
    }
  }
  if (action.effort !== "low" && action.effort !== "medium" && action.effort !== "high") return undefined;
  const modeApplicability: readonly ("fidelity" | "throughput")[] = Array.isArray(rec.modeApplicability)
    ? rec.modeApplicability.filter((v): v is "fidelity" | "throughput" => v === "fidelity" || v === "throughput")
    : ["fidelity", "throughput"];
  return {
    id: rec.id,
    title: rec.title,
    category: rec.category,
    priorityScore: rec.priorityScore,
    confidence: rec.confidence,
    estimatedImpact: {
      ...(typeof estimatedImpact.timeMs === "number" ? { timeMs: estimatedImpact.timeMs } : {}),
      ...(typeof estimatedImpact.bytes === "number" ? { bytes: estimatedImpact.bytes } : {}),
      affectedCombos: estimatedImpact.affectedCombos,
    },
    evidence,
    action: {
      summary: action.summary,
      steps,
      effort: action.effort,
    },
    modeApplicability: modeApplicability.length > 0 ? modeApplicability : ["fidelity", "throughput"],
  };
}

function parseResultsBestEffort(raw: unknown): ResultsV3 | undefined {
  if (!raw || typeof raw !== "object") return undefined;
  const rec = raw as { readonly results?: unknown };
  if (!Array.isArray(rec.results)) return undefined;
  return raw as ResultsV3;
}

function compareComboSeverity(a: ResultsV3Line, b: ResultsV3Line): number {
  const score = (line: ResultsV3Line): number => {
    if (typeof line.runtimeErrorMessage === "string" && line.runtimeErrorMessage.length > 0) return -1;
    if (typeof line.runtimeErrorCode === "string" && line.runtimeErrorCode.length > 0) return -1;
    if (typeof line.scores.performance === "number") return line.scores.performance;
    return 101;
  };
  const scoreDelta: number = score(a) - score(b);
  if (scoreDelta !== 0) return scoreDelta;
  const pathDelta: number = a.path.localeCompare(b.path);
  if (pathDelta !== 0) return pathDelta;
  const deviceDelta: number = a.device.localeCompare(b.device);
  if (deviceDelta !== 0) return deviceDelta;
  return a.label.localeCompare(b.label);
}

function pickAffectedCombos(params: { readonly suggestion: SuggestionV3; readonly results: readonly ResultsV3Line[] }): readonly AnalyzeActionV6["affectedCombos"][number][] {
  const issueId: string | undefined = extractIssueIdFromSuggestionId(params.suggestion.id);
  const titleNorm: string = normalizeText(params.suggestion.title);
  const matches: ResultsV3Line[] = [];
  for (const result of params.results) {
    const hasMatch: boolean = result.opportunities.some((opportunity) => {
      if (typeof issueId === "string" && opportunity.id === issueId) return true;
      return normalizeText(opportunity.title) === titleNorm;
    });
    if (hasMatch) {
      matches.push(result);
    }
  }
  const sorted: ResultsV3Line[] = [...(matches.length > 0 ? matches : params.results)].sort(compareComboSeverity);
  const requestedCount = Math.max(1, Math.round(params.suggestion.estimatedImpact.affectedCombos));
  return sorted.slice(0, requestedCount).map((row) => ({
    label: row.label,
    path: row.path,
    device: row.device,
  }));
}

function buildExpectedDirection(params: { readonly combos: readonly ResultsV3Line[]; readonly suggestion: SuggestionV3 }): AnalyzeActionV6["verifyPlan"]["expectedDirection"] {
  const expectedDirection: {
    score?: "up";
    lcpMs?: "down";
    tbtMs?: "down";
    cls?: "down";
    bytes?: "down";
  } = { score: "up" };
  if (params.combos.some((combo) => typeof combo.metrics.lcpMs === "number")) {
    expectedDirection.lcpMs = "down";
  }
  if (params.combos.some((combo) => typeof combo.metrics.tbtMs === "number")) {
    expectedDirection.tbtMs = "down";
  }
  if (params.combos.some((combo) => typeof combo.metrics.cls === "number")) {
    expectedDirection.cls = "down";
  }
  if (typeof params.suggestion.estimatedImpact.bytes === "number" && params.suggestion.estimatedImpact.bytes > 0) {
    expectedDirection.bytes = "down";
  }
  return expectedDirection;
}

function deriveVerifyRoutes(affected: readonly AnalyzeActionV6["affectedCombos"][number][]): readonly string[] {
  const ordered = new Set<string>();
  for (const combo of affected) {
    if (ordered.size >= 10) break;
    ordered.add(combo.path);
  }
  return [...ordered];
}

function deterministicActionId(sourceSuggestionId: string): string {
  const clean: string = sourceSuggestionId.toLowerCase().replace(/[^a-z0-9-]/g, "-").replace(/-+/g, "-").replace(/(^-|-$)/g, "");
  return `action-${clean.length > 0 ? clean : "item"}`;
}

function estimateActionTokens(actions: readonly AnalyzeActionV6[]): number {
  const bytes: number = Buffer.byteLength(JSON.stringify(actions), "utf8");
  return Math.ceil(bytes / 4);
}

function getProfileCaps(profile: AnalyzeArtifactProfileV6): { readonly actions: number; readonly evidencePerAction: number } {
  if (profile === "lean") {
    return { actions: 12, evidencePerAction: 2 };
  }
  if (profile === "standard") {
    return { actions: 25, evidencePerAction: 5 };
  }
  return { actions: 50, evidencePerAction: 10 };
}

function formatAnalyzeMarkdown(report: AnalyzeReportV6): string {
  const lines: string[] = [];
  lines.push("# Signaler Analyze Digest");
  lines.push("");
  lines.push(`Generated: ${report.generatedAt}`);
  lines.push(`Mode: ${report.source.runMode}`);
  lines.push(`Profile: ${report.source.runProfile}`);
  lines.push(`Comparability: ${report.source.runComparabilityHash}`);
  lines.push(`Artifact profile: ${report.artifactProfile}`);
  lines.push(`Token budget: ${report.tokenBudget}`);
  lines.push(`Estimated tokens: ${report.summary.estimatedTokens}`);
  if (report.externalSignals !== undefined) {
    lines.push(
      `External signals: accepted=${report.externalSignals.accepted}, rejected=${report.externalSignals.rejected}, digest=${report.externalSignals.digest}`,
    );
  }
  if (report.multiBenchmark !== undefined) {
    lines.push(
      `Benchmark signals: sources=${report.multiBenchmark.sources.join(",") || "-"}, accepted=${report.multiBenchmark.accepted}, rejected=${report.multiBenchmark.rejected}, digest=${report.multiBenchmark.digest}`,
    );
  }
  if (report.accelerators?.rustBenchmark !== undefined) {
    const rust = report.accelerators.rustBenchmark;
    lines.push(
      `Rust benchmark accelerator: requested=${rust.requested}, enabled=${rust.enabled}, used=${rust.used}, normalizeCommand=${rust.sidecarCommand ?? "-"}, normalizeElapsedMs=${rust.sidecarElapsedMs ?? "-"}, scoreCommand=${rust.scoreSidecarCommand ?? "-"}, scoreElapsedMs=${rust.scoreSidecarElapsedMs ?? "-"}, scoreMatchedRecords=${rust.scoreMatchedRecordsCount ?? "-"}`,
    );
  }
  lines.push("");
  lines.push("## Summary");
  lines.push("");
  lines.push(`- Candidates: ${report.summary.totalCandidates}`);
  lines.push(`- Emitted actions: ${report.summary.emittedActions}`);
  lines.push(`- Dropped zero-impact: ${report.summary.droppedZeroImpact}`);
  lines.push(`- Dropped low-confidence: ${report.summary.droppedLowConfidence}`);
  lines.push(`- Dropped missing evidence: ${report.summary.droppedMissingEvidence}`);
  lines.push(`- Dropped duplicate: ${report.summary.droppedDuplicate}`);
  lines.push(`- Dropped by profile cap: ${report.summary.droppedByProfileCap}`);
  lines.push(`- Dropped by --top-actions: ${report.summary.droppedByTopActions}`);
  lines.push(`- Dropped by token budget: ${report.summary.droppedByTokenBudget}`);
  if (report.summary.warnings.length > 0) {
    lines.push("");
    lines.push("Warnings:");
    for (const warning of report.summary.warnings) {
      lines.push(`- ${warning}`);
    }
  }
  lines.push("");
  lines.push("## Top Actions");
  lines.push("");
  if (report.actions.length === 0) {
    lines.push("- No actions emitted.");
  } else {
    for (const action of report.actions) {
      lines.push(`### ${action.title}`);
      lines.push("");
      lines.push(`- ID: ${action.id}`);
      lines.push(`- Source suggestion: ${action.sourceSuggestionId ?? "-"}`);
      lines.push(`- Priority: ${action.priorityScore}`);
      lines.push(`- Confidence: ${action.confidence}`);
      lines.push(`- Impact: timeMs=${action.estimatedImpact.timeMs ?? "-"} bytes=${action.estimatedImpact.bytes ?? "-"} affectedCombos=${action.estimatedImpact.affectedCombos}`);
      lines.push(`- Verify mode: ${action.verifyPlan.recommendedMode}`);
      lines.push(`- Verify routes: ${action.verifyPlan.targetRoutes.join(", ")}`);
      lines.push(`- Expected direction: ${Object.entries(action.verifyPlan.expectedDirection).map(([k, v]) => `${k}:${v}`).join(", ")}`);
      lines.push(`- Action summary: ${action.action.summary}`);
      lines.push("");
    }
  }
  return `${lines.join("\n")}\n`;
}

function printNonJsonSummary(report: AnalyzeReportV6): void {
  // eslint-disable-next-line no-console
  console.log(`Analyze complete: ${report.actions.length} action(s) written.`);
  // eslint-disable-next-line no-console
  console.log("Outputs: .signaler/analyze.json, .signaler/analyze.md");
}

function printJsonSummary(params: {
  readonly report: AnalyzeReportV6;
  readonly elapsedMs: number;
}): void {
  const report: AnalyzeReportV6 = params.report;
  const compact = {
    command: "analyze",
    contract: "v6",
    status: "ok",
    outputDir: report.source.dir,
    emittedActions: report.summary.emittedActions,
    estimatedTokens: report.summary.estimatedTokens,
    droppedByTokenBudget: report.summary.droppedByTokenBudget,
    elapsedMs: params.elapsedMs,
  };
  // eslint-disable-next-line no-console
  console.log(JSON.stringify(compact));
}

function requiredArtifactNames(): readonly string[] {
  return ["run.json", "results.json", "suggestions.json", "agent-index.json"] as const;
}

export async function runAnalyzeCli(argv: readonly string[]): Promise<void> {
  const exitCode: AnalyzeExitCode = await runAnalyzeCliInternal(argv);
  process.exitCode = exitCode;
}

async function runAnalyzeCliInternal(argv: readonly string[]): Promise<AnalyzeExitCode> {
  const startedAtMs: number = Date.now();
  let args: AnalyzeArgs;
  try {
    args = parseArgs(argv);
  } catch (error: unknown) {
    // eslint-disable-next-line no-console
    console.error(error instanceof Error ? error.message : String(error));
    return 1;
  }

  if (args.contract !== "v6") {
    // eslint-disable-next-line no-console
    console.error("The analyze command is gated to V6 in this phase. Run with: signaler analyze --contract v6");
    return 1;
  }

  const warnings: string[] = [];
  const artifactPath = (name: string): string => resolve(args.dir, name);
  let loadedExternalSignals: Awaited<ReturnType<typeof loadExternalSignalsFromFiles>>;
  let benchmarkRustAttempt: Awaited<ReturnType<typeof loadMultiBenchmarkSignalsWithRust>>;
  try {
    loadedExternalSignals = await loadExternalSignalsFromFiles(args.externalSignalsPaths);
    benchmarkRustAttempt = await loadMultiBenchmarkSignalsWithRust(args.benchmarkSignalsPaths);
  } catch (error: unknown) {
    // eslint-disable-next-line no-console
    console.error(error instanceof Error ? error.message : String(error));
    return 1;
  }
  if (benchmarkRustAttempt.enabled && !benchmarkRustAttempt.used && typeof benchmarkRustAttempt.fallbackReason === "string") {
    warnings.push(`Rust benchmark fallback: ${benchmarkRustAttempt.fallbackReason}`);
  }

  const loadArtifact = async <T>(params: {
    readonly file: string;
    readonly required: boolean;
    readonly validator?: (value: unknown) => value is T;
    readonly parser?: (value: unknown) => T | undefined;
  }): Promise<T | undefined> => {
    const path: string = artifactPath(params.file);
    if (!(await fileExists(path))) {
      if (args.strict && params.required) {
        throw new StrictValidationError(`Missing required artifact: ${params.file}`);
      }
      if (params.required) {
        warnings.push(`Missing required artifact in non-strict mode: ${params.file}`);
      }
      return undefined;
    }
    let parsed: unknown;
    try {
      parsed = await readJson(path);
    } catch {
      if (args.strict && params.required) {
        throw new StrictValidationError(`Failed to parse required JSON artifact: ${params.file}`);
      }
      warnings.push(`Skipping malformed JSON artifact: ${params.file}`);
      return undefined;
    }
    if (params.validator) {
      if (params.validator(parsed)) {
        return parsed;
      }
      if (args.strict && params.required) {
        throw new StrictValidationError(`Schema validation failed for required artifact: ${params.file}`);
      }
      if (params.parser) {
        const normalizedFromParser: T | undefined = params.parser(parsed);
        if (normalizedFromParser !== undefined) {
          warnings.push(`Schema mismatch tolerated in non-strict mode: ${params.file}`);
          return normalizedFromParser;
        }
      }
      warnings.push(`Schema validation failed, artifact ignored in non-strict mode: ${params.file}`);
      return undefined;
    }
    if (params.parser) {
      const normalized: T | undefined = params.parser(parsed);
      if (normalized !== undefined) {
        return normalized;
      }
      if (args.strict && params.required) {
        throw new StrictValidationError(`Schema validation failed for required artifact: ${params.file}`);
      }
      warnings.push(`Could not parse artifact, using best effort: ${params.file}`);
      return undefined;
    }
    return parsed as T;
  };

  let runInput: AnalyzeRunInput | undefined;
  let results: ResultsV3 | undefined;
  let suggestions: SuggestionsV3 | undefined;
  let agentIndex: AgentIndexV3 | undefined;

  try {
    runInput = await loadArtifact<AnalyzeRunInput>({
      file: "run.json",
      required: true,
      validator: isRunInput,
      parser: parseRunBestEffort,
    });
    results = await loadArtifact<ResultsV3>({
      file: "results.json",
      required: true,
      validator: isResultsV3,
      parser: parseResultsBestEffort,
    });
    suggestions = await loadArtifact<SuggestionsV3>({
      file: "suggestions.json",
      required: true,
      validator: isSuggestionsV3,
      parser: (value: unknown): SuggestionsV3 | undefined => {
        if (!value || typeof value !== "object") return undefined;
        const rec = value as { readonly generatedAt?: unknown; readonly mode?: unknown; readonly comparabilityHash?: unknown; readonly suggestions?: unknown };
        if (typeof rec.generatedAt !== "string") return undefined;
        if (rec.mode !== "fidelity" && rec.mode !== "throughput") return undefined;
        if (typeof rec.comparabilityHash !== "string" || rec.comparabilityHash.length === 0) return undefined;
        if (!Array.isArray(rec.suggestions)) return undefined;
        const parsedSuggestions: SuggestionV3[] = [];
        for (const row of rec.suggestions) {
          const parsed = parseSuggestionBestEffort(row);
          if (parsed) {
            parsedSuggestions.push(parsed);
          }
        }
        return {
          generatedAt: rec.generatedAt,
          mode: rec.mode,
          comparabilityHash: rec.comparabilityHash,
          suggestions: parsedSuggestions,
        };
      },
    });
    agentIndex = await loadArtifact<AgentIndexV3>({
      file: "agent-index.json",
      required: true,
      validator: isAgentIndexV3,
      parser: (value: unknown) => (value && typeof value === "object" ? (value as AgentIndexV3) : undefined),
    });
  } catch (error: unknown) {
    if (error instanceof StrictValidationError) {
      // eslint-disable-next-line no-console
      console.error(error.message);
      return 2;
    }
    // eslint-disable-next-line no-console
    console.error(error instanceof Error ? error.message : String(error));
    return 1;
  }

  const optionalFiles: readonly string[] = ["issues.json", "discovery.json", "analyze.json"] as const;
  for (const file of optionalFiles) {
    const path: string = artifactPath(file);
    if (!(await fileExists(path))) continue;
    try {
      await readJson(path);
    } catch {
      warnings.push(`Optional artifact is malformed JSON and was ignored: ${file}`);
    }
  }

  if (!suggestions || !results || suggestions.suggestions.length === 0) {
    // eslint-disable-next-line no-console
    console.error("Analyze could not build actions from artifacts. Ensure run/results/suggestions exist and are valid.");
    return 1;
  }

  if (args.strict) {
    for (const required of requiredArtifactNames()) {
      if (!(await fileExists(artifactPath(required)))) {
        // eslint-disable-next-line no-console
        console.error(`Missing required artifact: ${required}`);
        return 2;
      }
    }
  }

  const profileCaps = getProfileCaps(args.artifactProfile);
  const minRank: number = confidenceRank(args.minConfidence);
  const allResults: ResultsV3Line[] = Array.isArray(results.results) ? [...results.results] : [];
  const knownIssueIds: ReadonlySet<string> = new Set(
    suggestions.suggestions
      .map((row) => extractIssueIdFromSuggestionId(row.id))
      .filter((row): row is string => typeof row === "string" && row.length > 0),
  );
  const knownPaths: ReadonlySet<string> = new Set(allResults.map((row) => row.path));
  const externalSignalsEval = evaluateConservativeExternalSignals({
    loaded: loadedExternalSignals,
    knownIssueIds,
    knownPaths,
  });
  const externalSignalsMetadata = externalSignalsEval?.metadata ?? buildDefaultExternalSignalsMetadata();
  const benchmarkSignalsEval = evaluateConservativeMultiBenchmarkSignals({
    loaded: benchmarkRustAttempt.loaded,
    knownIssueIds,
    knownPaths,
  });
  const multiBenchmarkMetadata = benchmarkSignalsEval?.metadata ?? buildDefaultMultiBenchmarkMetadata();
  const candidateDrafts: CandidateDraft[] = [];
  const benchmarkScoreQueries: {
    candidateId: string;
    issueId: string;
    allowedPaths?: readonly string[];
  }[] = [];
  const dedupeSet = new Set<string>();

  let droppedZeroImpact = 0;
  let droppedLowConfidence = 0;
  let droppedMissingEvidence = 0;
  let droppedDuplicate = 0;

  for (const suggestion of suggestions.suggestions) {
    const timeMs: number = typeof suggestion.estimatedImpact.timeMs === "number" ? suggestion.estimatedImpact.timeMs : 0;
    const bytes: number = typeof suggestion.estimatedImpact.bytes === "number" ? suggestion.estimatedImpact.bytes : 0;
    if (timeMs <= 0 && bytes <= 0) {
      droppedZeroImpact += 1;
      continue;
    }

    if (confidenceRank(suggestion.confidence) < minRank) {
      droppedLowConfidence += 1;
      continue;
    }

    const evidence = suggestion.evidence.filter((row) => row.sourceRelPath.length > 0 && row.pointer.length > 0);
    if (evidence.length === 0) {
      droppedMissingEvidence += 1;
      continue;
    }

    const primaryEvidence = evidence[0];
    const dedupeKey: string = `${normalizeText(suggestion.title)}|${normalizeText(suggestion.action.summary)}|${normalizeText(`${primaryEvidence.sourceRelPath}:${primaryEvidence.pointer}`)}`;
    if (dedupeSet.has(dedupeKey)) {
      droppedDuplicate += 1;
      continue;
    }
    dedupeSet.add(dedupeKey);

    const issueId: string | undefined = extractIssueIdFromSuggestionId(suggestion.id);
    const matchedCombos = pickAffectedCombos({ suggestion, results: allResults });
    const matchedPaths: readonly string[] = [...new Set(matchedCombos.map((combo) => combo.path))];
    const matchedExternalSignals = typeof issueId === "string"
      ? matchAcceptedExternalSignals({
        accepted: externalSignalsEval?.acceptedRecords ?? [],
        issueId,
        allowedPaths: matchedPaths,
      })
      : { totalBoost: 0, evidence: [] as const };
    const comboMap: Map<string, ResultsV3Line> = new Map(allResults.map((row) => [`${row.label}|${row.path}|${row.device}`, row] as const));
    const matchedRows: ResultsV3Line[] = matchedCombos
      .map((combo) => comboMap.get(`${combo.label}|${combo.path}|${combo.device}`))
      .filter((row): row is ResultsV3Line => row !== undefined);
    const effectiveCoverage = Math.max(1, matchedCombos.length);
    const coverageWeight: number = Math.min(2, Math.max(1, 1 + Math.log10(Math.max(1, effectiveCoverage))));
    const basePriority: number = Math.round(suggestion.priorityScore * confidenceWeight(suggestion.confidence) * coverageWeight);
    candidateDrafts.push({
      sourceSuggestionId: suggestion.id,
      title: suggestion.title,
      category: suggestion.category,
      confidence: suggestion.confidence,
      estimatedImpact: {
        ...(typeof suggestion.estimatedImpact.timeMs === "number" ? { timeMs: suggestion.estimatedImpact.timeMs } : {}),
        ...(typeof suggestion.estimatedImpact.bytes === "number" ? { bytes: suggestion.estimatedImpact.bytes } : {}),
        affectedCombos: Math.max(1, matchedCombos.length),
      },
      affectedCombos: matchedCombos,
      baseEvidence: evidence,
      action: {
        summary: suggestion.action.summary,
        steps: [...suggestion.action.steps],
        effort: suggestion.action.effort,
      },
      verifyPlan: {
        recommendedMode: "fidelity",
        targetRoutes: deriveVerifyRoutes(matchedCombos),
        expectedDirection: buildExpectedDirection({ combos: matchedRows, suggestion }),
      },
      basePriority,
      externalBoost: matchedExternalSignals,
      ...(typeof issueId === "string"
        ? {
          benchmarkQuery: {
            candidateId: suggestion.id,
            issueId,
            ...(matchedPaths.length > 0 ? { allowedPaths: matchedPaths } : {}),
          },
        }
        : {}),
    });
    if (typeof issueId === "string") {
      benchmarkScoreQueries.push({
        candidateId: suggestion.id,
        issueId,
        ...(matchedPaths.length > 0 ? { allowedPaths: matchedPaths } : {}),
      });
    }
  }

  const benchmarkScoreAttempt = await scoreMultiBenchmarkWithRust({
    accepted: benchmarkSignalsEval?.acceptedRecords ?? [],
    candidates: benchmarkScoreQueries,
  });
  if (benchmarkScoreAttempt.enabled && !benchmarkScoreAttempt.used && typeof benchmarkScoreAttempt.fallbackReason === "string") {
    warnings.push(`Rust benchmark scoring fallback: ${benchmarkScoreAttempt.fallbackReason}`);
  }

  const zeroBenchmarkMatch = {
    totalBoost: 0,
    sourceBoosts: {
      "accessibility-extended": 0,
      "security-baseline": 0,
      "seo-technical": 0,
      "reliability-slo": 0,
      "cross-browser-parity": 0,
    },
    evidence: [] as const,
  };
  const candidates: CandidateAction[] = candidateDrafts.map((draft) => {
    const benchmarkMatch = draft.benchmarkQuery
      ? (benchmarkScoreAttempt.scores.get(draft.benchmarkQuery.candidateId) ?? zeroBenchmarkMatch)
      : zeroBenchmarkMatch;
    const rankedPriority: number = Math.round(
      draft.basePriority * (1 + draft.externalBoost.totalBoost + benchmarkMatch.totalBoost),
    );
    return {
      sourceSuggestionId: draft.sourceSuggestionId,
      title: draft.title,
      category: draft.category,
      priorityScore: rankedPriority,
      confidence: draft.confidence,
      estimatedImpact: draft.estimatedImpact,
      affectedCombos: draft.affectedCombos,
      evidence: [...new Map(
        [...draft.baseEvidence, ...draft.externalBoost.evidence, ...benchmarkMatch.evidence]
          .map((row) => [`${row.sourceRelPath}|${row.pointer}|${row.artifactRelPath ?? ""}`, row] as const),
      ).values()].slice(0, profileCaps.evidencePerAction),
      action: draft.action,
      verifyPlan: draft.verifyPlan,
    };
  });

  const ranked: CandidateAction[] = [...candidates].sort((a, b) => {
    if (b.priorityScore !== a.priorityScore) return b.priorityScore - a.priorityScore;
    return a.sourceSuggestionId.localeCompare(b.sourceSuggestionId);
  });

  const afterProfileCap: CandidateAction[] = ranked.slice(0, profileCaps.actions);
  const droppedByProfileCap: number = Math.max(0, ranked.length - afterProfileCap.length);
  const afterTopActions: CandidateAction[] = afterProfileCap.slice(0, args.topActions);
  const droppedByTopActions: number = Math.max(0, afterProfileCap.length - afterTopActions.length);

  const shapedActions: AnalyzeActionV6[] = [];
  const usedActionIds = new Set<string>();
  for (const candidate of afterTopActions) {
    const baseId: string = deterministicActionId(candidate.sourceSuggestionId);
    let resolvedId: string = baseId;
    let suffix = 2;
    while (usedActionIds.has(resolvedId)) {
      resolvedId = `${baseId}-${suffix}`;
      suffix += 1;
    }
    usedActionIds.add(resolvedId);
    shapedActions.push({
      id: resolvedId,
      sourceSuggestionId: candidate.sourceSuggestionId,
      title: candidate.title,
      category: candidate.category,
      priorityScore: candidate.priorityScore,
      confidence: candidate.confidence,
      estimatedImpact: candidate.estimatedImpact,
      affectedCombos: candidate.affectedCombos,
      evidence: candidate.evidence,
      action: candidate.action,
      verifyPlan: candidate.verifyPlan,
    });
  }

  let tokenTrimmedActions: AnalyzeActionV6[] = [...shapedActions];
  let droppedByTokenBudget = 0;
  let estimatedTokens = estimateActionTokens(tokenTrimmedActions);
  while (tokenTrimmedActions.length > 0 && estimatedTokens > args.tokenBudget) {
    tokenTrimmedActions = tokenTrimmedActions.slice(0, tokenTrimmedActions.length - 1);
    droppedByTokenBudget += 1;
    estimatedTokens = estimateActionTokens(tokenTrimmedActions);
  }

  if (tokenTrimmedActions.length === 0) {
    warnings.push("Token budget trimmed all actions. Increase --token-budget or use --artifact-profile lean.");
  }

  if (tokenTrimmedActions.length === 0) {
    // eslint-disable-next-line no-console
    console.error("Analyze produced zero valid actions after filtering and budget enforcement.");
    return 1;
  }
  const hasBenchmarkBoost: boolean = (benchmarkSignalsEval?.acceptedRecords.length ?? 0) > 0;
  const rustBenchmarkAccelerator = {
    requested: args.benchmarkSignalsPaths.length > 0,
    enabled: benchmarkRustAttempt.enabled || benchmarkScoreAttempt.enabled,
    used: benchmarkRustAttempt.used || benchmarkScoreAttempt.used,
    ...(typeof benchmarkScoreAttempt.fallbackReason === "string"
      ? { fallbackReason: benchmarkScoreAttempt.fallbackReason }
      : (typeof benchmarkRustAttempt.fallbackReason === "string" ? { fallbackReason: benchmarkRustAttempt.fallbackReason } : {})),
    ...(typeof benchmarkRustAttempt.sidecarElapsedMs === "number" ? { sidecarElapsedMs: benchmarkRustAttempt.sidecarElapsedMs } : {}),
    ...(benchmarkRustAttempt.sidecarCommand !== undefined ? { sidecarCommand: benchmarkRustAttempt.sidecarCommand } : {}),
    ...(typeof benchmarkScoreAttempt.sidecarElapsedMs === "number" ? { scoreSidecarElapsedMs: benchmarkScoreAttempt.sidecarElapsedMs } : {}),
    ...(benchmarkScoreAttempt.sidecarCommand !== undefined ? { scoreSidecarCommand: benchmarkScoreAttempt.sidecarCommand } : {}),
    ...(typeof benchmarkScoreAttempt.matchedRecordsCount === "number" ? { scoreMatchedRecordsCount: benchmarkScoreAttempt.matchedRecordsCount } : {}),
    ...(benchmarkRustAttempt.normalizeStats?.recordsCount !== undefined ? { recordsCount: benchmarkRustAttempt.normalizeStats.recordsCount } : {}),
    ...(benchmarkRustAttempt.normalizeStats?.inputRecordsCount !== undefined ? { inputRecordsCount: benchmarkRustAttempt.normalizeStats.inputRecordsCount } : {}),
    ...(benchmarkRustAttempt.normalizeStats?.dedupedRecordsCount !== undefined ? { dedupedRecordsCount: benchmarkRustAttempt.normalizeStats.dedupedRecordsCount } : {}),
    ...(benchmarkRustAttempt.normalizeStats?.recordsDigest !== undefined ? { recordsDigest: benchmarkRustAttempt.normalizeStats.recordsDigest } : {}),
  } as const;

  const report: AnalyzeReportV6 = {
    schemaVersion: 1,
    generatedAt: new Date().toISOString(),
    source: {
      dir: normalizePathForReport(args.dir),
      runComparabilityHash: runInput?.protocol?.comparabilityHash ?? agentIndex?.comparabilityHash ?? suggestions.comparabilityHash,
      runMode: runInput?.protocol?.mode ?? suggestions.mode,
      runProfile: runInput?.protocol?.profile ?? agentIndex?.profile ?? "unknown",
    },
    artifactProfile: args.artifactProfile,
    tokenBudget: args.tokenBudget,
    rankingPolicy: {
      version: hasBenchmarkBoost ? "v6.3" : "v6.2",
      formula: hasBenchmarkBoost
        ? "priority = round(basePriority * confidenceWeight * coverageWeight * (1 + externalBoostWeight + benchmarkBoostWeight))"
        : "priority = round(basePriority * confidenceWeight * coverageWeight * (1 + externalBoostWeight))",
      confidenceWeights: {
        high: 1.0,
        medium: 0.7,
        low: 0.4,
      },
    },
    actions: tokenTrimmedActions,
    accelerators: {
      rustBenchmark: rustBenchmarkAccelerator,
    },
    externalSignals: externalSignalsMetadata,
    multiBenchmark: multiBenchmarkMetadata,
    summary: {
      totalCandidates: suggestions.suggestions.length,
      emittedActions: tokenTrimmedActions.length,
      droppedZeroImpact,
      droppedLowConfidence,
      droppedMissingEvidence,
      droppedDuplicate,
      droppedByProfileCap,
      droppedByTopActions,
      droppedByTokenBudget,
      estimatedTokens,
      warnings,
    },
  };

  if (!isAnalyzeReportV6(report)) {
    // eslint-disable-next-line no-console
    console.error("Internal contract error: analyze.json failed v6 validation.");
    return 1;
  }

  const analyzeJsonPath: string = artifactPath("analyze.json");
  const analyzeMdPath: string = artifactPath("analyze.md");
  await writeFile(analyzeJsonPath, `${JSON.stringify(report, null, 2)}\n`, "utf8");
  await writeFile(analyzeMdPath, formatAnalyzeMarkdown(report), "utf8");

  if (args.json) {
    printJsonSummary({
      report,
      elapsedMs: Date.now() - startedAtMs,
    });
  } else {
    printNonJsonSummary(report);
  }

  return 0;
}

export type { AnalyzeArgs };
