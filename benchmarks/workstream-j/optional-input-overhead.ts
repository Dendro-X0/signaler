import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { performance } from "node:perf_hooks";
import { fileURLToPath } from "node:url";
import { runAnalyzeCli } from "../../src/analyze-cli.js";
import type { AnalyzeReportV6 } from "../../src/contracts/v6/analyze-v6.js";
import { isAnalyzeReportV6 } from "../../src/contracts/v6/validators.js";

type CaseId = "baseline" | "benchmark";

type TimingStats = {
  readonly samples: readonly number[];
  readonly minMs: number;
  readonly maxMs: number;
  readonly meanMs: number;
  readonly medianMs: number;
  readonly p95Ms: number;
};

type CaseReport = {
  readonly id: CaseId;
  readonly elapsedMs: TimingStats;
  readonly emittedActionsMean: number;
  readonly multiBenchmark: {
    readonly enabled: boolean;
    readonly accepted: number;
    readonly rejected: number;
    readonly digest: string | null;
    readonly policy: string | null;
    readonly rankingVersion: string | null;
  };
};

type EvidenceReport = {
  readonly schemaVersion: 1;
  readonly generatedAt: string;
  readonly status: "pass" | "fail";
  readonly workspaceDir: string;
  readonly iterations: number;
  readonly benchmarkSignalFiles: readonly string[];
  readonly budgets: {
    readonly maxMedianOverheadMs: number;
    readonly maxP95OverheadMs: number;
  };
  readonly cases: {
    readonly baseline: CaseReport;
    readonly benchmark: CaseReport;
  };
  readonly overhead: {
    readonly medianMs: number;
    readonly p95Ms: number;
    readonly medianPct: number;
    readonly p95Pct: number;
  };
  readonly assertions: {
    readonly baselineHasNoBenchmarkMerge: boolean;
    readonly benchmarkHasAcceptedRecords: boolean;
    readonly medianOverheadWithinBudget: boolean;
    readonly p95OverheadWithinBudget: boolean;
  };
  readonly notes: readonly string[];
};

type CliArgs = {
  readonly outJsonPath: string;
  readonly outMarkdownPath: string;
  readonly workspaceDir: string;
  readonly iterations: number;
  readonly maxMedianOverheadMs: number;
  readonly maxP95OverheadMs: number;
};

const SCRIPT_PATH = fileURLToPath(import.meta.url);
const ROOT = resolve(SCRIPT_PATH, "..", "..", "..");
const DAY_MS = 24 * 60 * 60 * 1000;

function parseIntegerFlag(name: string, raw: string, min: number): number {
  const value = Number.parseInt(raw, 10);
  if (!Number.isFinite(value) || value < min) {
    throw new Error(`Invalid ${name}: ${raw}. Expected integer >= ${min}.`);
  }
  return value;
}

function parseNumberFlag(name: string, raw: string, min: number): number {
  const value = Number(raw);
  if (!Number.isFinite(value) || value < min) {
    throw new Error(`Invalid ${name}: ${raw}. Expected number >= ${min}.`);
  }
  return value;
}

function parseArgs(argv: readonly string[]): CliArgs {
  let outJsonPath = resolve(ROOT, "benchmarks", "out", "workstream-j-optional-input-overhead.json");
  let outMarkdownPath = resolve(ROOT, "benchmarks", "out", "workstream-j-optional-input-overhead.md");
  let workspaceDir = resolve(ROOT, "benchmarks", "workspaces", "workstream-j-optional-input-overhead");
  let iterations = 5;
  let maxMedianOverheadMs = 30;
  let maxP95OverheadMs = 60;

  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i] ?? "";
    if (arg === "--out-json" && i + 1 < argv.length) {
      outJsonPath = resolve(argv[i + 1] ?? outJsonPath);
      i += 1;
      continue;
    }
    if (arg.startsWith("--out-json=")) {
      outJsonPath = resolve(arg.slice("--out-json=".length));
      continue;
    }
    if (arg === "--out-md" && i + 1 < argv.length) {
      outMarkdownPath = resolve(argv[i + 1] ?? outMarkdownPath);
      i += 1;
      continue;
    }
    if (arg.startsWith("--out-md=")) {
      outMarkdownPath = resolve(arg.slice("--out-md=".length));
      continue;
    }
    if (arg === "--workspace" && i + 1 < argv.length) {
      workspaceDir = resolve(argv[i + 1] ?? workspaceDir);
      i += 1;
      continue;
    }
    if (arg.startsWith("--workspace=")) {
      workspaceDir = resolve(arg.slice("--workspace=".length));
      continue;
    }
    if (arg === "--iterations" && i + 1 < argv.length) {
      iterations = parseIntegerFlag("--iterations", argv[i + 1] ?? "", 1);
      i += 1;
      continue;
    }
    if (arg.startsWith("--iterations=")) {
      iterations = parseIntegerFlag("--iterations", arg.slice("--iterations=".length), 1);
      continue;
    }
    if (arg === "--max-median-overhead-ms" && i + 1 < argv.length) {
      maxMedianOverheadMs = parseNumberFlag("--max-median-overhead-ms", argv[i + 1] ?? "", 0);
      i += 1;
      continue;
    }
    if (arg.startsWith("--max-median-overhead-ms=")) {
      maxMedianOverheadMs = parseNumberFlag("--max-median-overhead-ms", arg.slice("--max-median-overhead-ms=".length), 0);
      continue;
    }
    if (arg === "--max-p95-overhead-ms" && i + 1 < argv.length) {
      maxP95OverheadMs = parseNumberFlag("--max-p95-overhead-ms", argv[i + 1] ?? "", 0);
      i += 1;
      continue;
    }
    if (arg.startsWith("--max-p95-overhead-ms=")) {
      maxP95OverheadMs = parseNumberFlag("--max-p95-overhead-ms", arg.slice("--max-p95-overhead-ms=".length), 0);
      continue;
    }
  }

  return {
    outJsonPath,
    outMarkdownPath,
    workspaceDir,
    iterations,
    maxMedianOverheadMs,
    maxP95OverheadMs,
  };
}

function percentile(samples: readonly number[], ratio: number): number {
  if (samples.length === 0) return 0;
  const sorted = [...samples].sort((a, b) => a - b);
  const index = Math.ceil(sorted.length * ratio) - 1;
  const safeIndex = Math.max(0, Math.min(sorted.length - 1, index));
  return sorted[safeIndex] ?? 0;
}

function computeTimingStats(samples: readonly number[]): TimingStats {
  const total = samples.reduce((sum, value) => sum + value, 0);
  return {
    samples: [...samples],
    minMs: samples.length === 0 ? 0 : Math.min(...samples),
    maxMs: samples.length === 0 ? 0 : Math.max(...samples),
    meanMs: samples.length === 0 ? 0 : Math.round((total / samples.length) * 100) / 100,
    medianMs: percentile(samples, 0.5),
    p95Ms: percentile(samples, 0.95),
  };
}

function percentDelta(delta: number, baseline: number): number {
  const denominator = Math.max(1, baseline);
  return Math.round(((delta / denominator) * 100) * 100) / 100;
}

function toFreshIso(daysAgo: number): string {
  return new Date(Date.now() - daysAgo * DAY_MS).toISOString();
}

async function writeJson(pathToFile: string, value: unknown): Promise<void> {
  await mkdir(dirname(pathToFile), { recursive: true });
  await writeFile(pathToFile, `${JSON.stringify(value, null, 2)}\n`, "utf8");
}

async function readAnalyzeReport(pathToFile: string): Promise<AnalyzeReportV6> {
  const raw = await readFile(pathToFile, "utf8");
  const parsed = JSON.parse(raw) as unknown;
  if (!isAnalyzeReportV6(parsed)) {
    throw new Error(`Invalid analyze report shape: ${pathToFile}`);
  }
  return parsed;
}

async function writeCanonicalArtifacts(dir: string): Promise<void> {
  await rm(dir, { recursive: true, force: true });
  await mkdir(dir, { recursive: true });
  await writeJson(resolve(dir, "run.json"), {
    protocol: {
      mode: "throughput",
      profile: "throughput-balanced",
      comparabilityHash: "cmp-workstream-j-overhead",
    },
  });
  await writeJson(resolve(dir, "results.json"), {
    generatedAt: new Date().toISOString(),
    results: [
      {
        label: "Home",
        path: "/",
        url: "http://127.0.0.1:3000/",
        device: "mobile",
        scores: { performance: 45, accessibility: 93, bestPractices: 90, seo: 89 },
        metrics: { lcpMs: 3000, tbtMs: 350, cls: 0.06 },
        opportunities: [{ id: "unused-javascript", title: "Reduce unused JavaScript", estimatedSavingsMs: 900 }],
        failedAudits: [],
      },
      {
        label: "Docs",
        path: "/docs",
        url: "http://127.0.0.1:3000/docs",
        device: "desktop",
        scores: { performance: 61, accessibility: 96, bestPractices: 92, seo: 94 },
        metrics: { lcpMs: 2100, tbtMs: 200, cls: 0.03 },
        opportunities: [{ id: "server-response-time", title: "Reduce server response times (TTFB)", estimatedSavingsMs: 320 }],
        failedAudits: [],
      },
    ],
  });
  await writeJson(resolve(dir, "suggestions.json"), {
    generatedAt: new Date().toISOString(),
    mode: "throughput",
    comparabilityHash: "cmp-workstream-j-overhead",
    suggestions: [
      {
        id: "sugg-unused-javascript-1",
        title: "Reduce unused JavaScript",
        category: "performance",
        priorityScore: 1500,
        confidence: "high",
        estimatedImpact: { timeMs: 900, affectedCombos: 2 },
        evidence: [{ sourceRelPath: "issues.json", pointer: "/topIssues/0" }],
        action: { summary: "Shrink payload and lazy-load non-critical bundles.", steps: ["Split heavy bundles", "Delay non-critical scripts"], effort: "medium" },
        modeApplicability: ["fidelity", "throughput"],
      },
      {
        id: "sugg-server-response-time-2",
        title: "Reduce server response times (TTFB)",
        category: "performance",
        priorityScore: 1100,
        confidence: "high",
        estimatedImpact: { timeMs: 320, affectedCombos: 1 },
        evidence: [{ sourceRelPath: "issues.json", pointer: "/topIssues/1" }],
        action: { summary: "Reduce backend latency and cache expensive work.", steps: ["Profile server handlers", "Add cache controls"], effort: "medium" },
        modeApplicability: ["fidelity", "throughput"],
      },
    ],
  });
  await writeJson(resolve(dir, "agent-index.json"), {
    generatedAt: new Date().toISOString(),
    contractVersion: "v3",
    mode: "throughput",
    profile: "throughput-balanced",
    comparabilityHash: "cmp-workstream-j-overhead",
    tokenBudget: 8000,
    entrypoints: {
      run: "run.json",
      results: "results.json",
      suggestions: "suggestions.json",
    },
    topSuggestions: [
      {
        id: "sugg-unused-javascript-1",
        title: "Reduce unused JavaScript",
        priorityScore: 1500,
        confidence: "high",
        pointer: "suggestions[0]",
      },
    ],
  });
}

async function writeBenchmarkFixtures(workspaceDir: string): Promise<readonly string[]> {
  const fileA = resolve(workspaceDir, "benchmark-signals-a11y.json");
  const fileB = resolve(workspaceDir, "benchmark-signals-seo.json");
  await writeJson(fileA, {
    schemaVersion: 1,
    sources: [
      {
        sourceId: "accessibility-extended",
        collectedAt: toFreshIso(1),
        records: [
          {
            id: "a11y-1",
            target: { issueId: "unused-javascript", path: "/" },
            confidence: "high",
            evidence: [{ sourceRelPath: "bench/accessibility-extended.json", pointer: "/sources/0/records/0" }],
            metrics: { criticalViolationCount: 2 },
          },
        ],
      },
    ],
  });
  await writeJson(fileB, {
    schemaVersion: 1,
    sources: [
      {
        sourceId: "seo-technical",
        collectedAt: toFreshIso(2),
        records: [
          {
            id: "seo-1",
            target: { issueId: "server-response-time", path: "/docs" },
            confidence: "high",
            evidence: [{ sourceRelPath: "bench/seo-technical.json", pointer: "/sources/0/records/0" }],
            metrics: { crawlabilityIssueCount: 1 },
          },
        ],
      },
      {
        sourceId: "seo-technical",
        collectedAt: toFreshIso(45),
        records: [
          {
            id: "seo-stale-1",
            target: { issueId: "unused-javascript", path: "/" },
            confidence: "high",
            evidence: [{ sourceRelPath: "bench/seo-technical.json", pointer: "/sources/1/records/0" }],
          },
        ],
      },
    ],
  });
  return [fileA, fileB];
}

async function runCase(params: {
  readonly caseId: CaseId;
  readonly iterations: number;
  readonly workspaceDir: string;
  readonly benchmarkSignalFiles: readonly string[];
}): Promise<CaseReport> {
  const elapsedSamples: number[] = [];
  let emittedActionsSum = 0;
  let lastMetadata: CaseReport["multiBenchmark"] = {
    enabled: false,
    accepted: 0,
    rejected: 0,
    digest: null,
    policy: null,
    rankingVersion: null,
  };

  for (let i = 0; i < params.iterations; i += 1) {
    const runDir = resolve(params.workspaceDir, `.run-${params.caseId}-${String(i + 1).padStart(2, "0")}`);
    await writeCanonicalArtifacts(runDir);

    const argv: string[] = [
      "node",
      "signaler",
      "analyze",
      "--contract",
      "v6",
      "--dir",
      runDir,
      "--artifact-profile",
      "lean",
      "--json",
    ];
    if (params.caseId === "benchmark") {
      for (const file of params.benchmarkSignalFiles) {
        argv.push("--benchmark-signals", file);
      }
    }

    const startedAtMs = performance.now();
    process.exitCode = 0;
    await runAnalyzeCli(argv);
    const elapsedMs = Math.round(performance.now() - startedAtMs);
    const exitCode = process.exitCode ?? 0;
    if (exitCode !== 0) {
      throw new Error(`analyze failed for case=${params.caseId} iteration=${i + 1} exitCode=${exitCode}`);
    }
    elapsedSamples.push(elapsedMs);

    const analyzeReport = await readAnalyzeReport(resolve(runDir, "analyze.json"));
    emittedActionsSum += analyzeReport.summary.emittedActions;
    lastMetadata = {
      enabled: analyzeReport.multiBenchmark?.enabled ?? false,
      accepted: analyzeReport.multiBenchmark?.accepted ?? 0,
      rejected: analyzeReport.multiBenchmark?.rejected ?? 0,
      digest: analyzeReport.multiBenchmark?.digest ?? null,
      policy: analyzeReport.multiBenchmark?.policy ?? null,
      rankingVersion: analyzeReport.multiBenchmark?.rankingVersion ?? null,
    };
  }

  return {
    id: params.caseId,
    elapsedMs: computeTimingStats(elapsedSamples),
    emittedActionsMean: Math.round((emittedActionsSum / params.iterations) * 100) / 100,
    multiBenchmark: lastMetadata,
  };
}

function toMarkdown(report: EvidenceReport): string {
  const lines: string[] = [];
  lines.push("# Workstream J Optional-Input Overhead Evidence");
  lines.push("");
  lines.push(`Generated: ${report.generatedAt}`);
  lines.push(`Status: ${report.status.toUpperCase()}`);
  lines.push(`Workspace: ${report.workspaceDir}`);
  lines.push(`Iterations per case: ${report.iterations}`);
  lines.push("");
  lines.push("## Timing");
  lines.push("");
  lines.push("| Case | Mean (ms) | Median (ms) | P95 (ms) | Min (ms) | Max (ms) |");
  lines.push("| --- | --- | --- | --- | --- | --- |");
  lines.push(
    `| baseline | ${report.cases.baseline.elapsedMs.meanMs} | ${report.cases.baseline.elapsedMs.medianMs} | ${report.cases.baseline.elapsedMs.p95Ms} | ${report.cases.baseline.elapsedMs.minMs} | ${report.cases.baseline.elapsedMs.maxMs} |`,
  );
  lines.push(
    `| benchmark-signals | ${report.cases.benchmark.elapsedMs.meanMs} | ${report.cases.benchmark.elapsedMs.medianMs} | ${report.cases.benchmark.elapsedMs.p95Ms} | ${report.cases.benchmark.elapsedMs.minMs} | ${report.cases.benchmark.elapsedMs.maxMs} |`,
  );
  lines.push("");
  lines.push("## Overhead");
  lines.push("");
  lines.push(`- median overhead: ${report.overhead.medianMs}ms (${report.overhead.medianPct}%)`);
  lines.push(`- p95 overhead: ${report.overhead.p95Ms}ms (${report.overhead.p95Pct}%)`);
  lines.push(`- budget max median overhead: ${report.budgets.maxMedianOverheadMs}ms`);
  lines.push(`- budget max p95 overhead: ${report.budgets.maxP95OverheadMs}ms`);
  lines.push("");
  lines.push("## Multi-Benchmark Metadata Snapshot");
  lines.push("");
  lines.push(`- baseline enabled: ${report.cases.baseline.multiBenchmark.enabled}`);
  lines.push(`- benchmark enabled: ${report.cases.benchmark.multiBenchmark.enabled}`);
  lines.push(`- benchmark accepted: ${report.cases.benchmark.multiBenchmark.accepted}`);
  lines.push(`- benchmark rejected: ${report.cases.benchmark.multiBenchmark.rejected}`);
  lines.push(`- benchmark digest: ${report.cases.benchmark.multiBenchmark.digest ?? "(null)"}`);
  lines.push("");
  lines.push("## Assertions");
  lines.push("");
  for (const [key, value] of Object.entries(report.assertions)) {
    lines.push(`- ${key}: ${value}`);
  }
  lines.push("");
  for (const note of report.notes) {
    lines.push(`- note: ${note}`);
  }
  lines.push("");
  return `${lines.join("\n")}\n`;
}

async function writeOptionalInputOverheadEvidence(args: CliArgs): Promise<EvidenceReport> {
  await rm(args.workspaceDir, { recursive: true, force: true });
  await mkdir(args.workspaceDir, { recursive: true });
  const benchmarkSignalFiles = await writeBenchmarkFixtures(args.workspaceDir);

  const baseline = await runCase({
    caseId: "baseline",
    iterations: args.iterations,
    workspaceDir: args.workspaceDir,
    benchmarkSignalFiles,
  });
  const benchmark = await runCase({
    caseId: "benchmark",
    iterations: args.iterations,
    workspaceDir: args.workspaceDir,
    benchmarkSignalFiles,
  });

  const medianOverheadMs = Math.round((benchmark.elapsedMs.medianMs - baseline.elapsedMs.medianMs) * 100) / 100;
  const p95OverheadMs = Math.round((benchmark.elapsedMs.p95Ms - baseline.elapsedMs.p95Ms) * 100) / 100;
  const medianOverheadPct = percentDelta(medianOverheadMs, baseline.elapsedMs.medianMs);
  const p95OverheadPct = percentDelta(p95OverheadMs, baseline.elapsedMs.p95Ms);

  const assertions = {
    baselineHasNoBenchmarkMerge: baseline.multiBenchmark.enabled === false && baseline.multiBenchmark.accepted === 0,
    benchmarkHasAcceptedRecords: benchmark.multiBenchmark.enabled && benchmark.multiBenchmark.accepted > 0,
    medianOverheadWithinBudget: medianOverheadMs <= args.maxMedianOverheadMs,
    p95OverheadWithinBudget: p95OverheadMs <= args.maxP95OverheadMs,
  } as const;
  const status: EvidenceReport["status"] = Object.values(assertions).every(Boolean) ? "pass" : "fail";

  const report: EvidenceReport = {
    schemaVersion: 1,
    generatedAt: new Date().toISOString(),
    status,
    workspaceDir: args.workspaceDir,
    iterations: args.iterations,
    benchmarkSignalFiles,
    budgets: {
      maxMedianOverheadMs: args.maxMedianOverheadMs,
      maxP95OverheadMs: args.maxP95OverheadMs,
    },
    cases: { baseline, benchmark },
    overhead: {
      medianMs: medianOverheadMs,
      p95Ms: p95OverheadMs,
      medianPct: medianOverheadPct,
      p95Pct: p95OverheadPct,
    },
    assertions,
    notes: [
      "This evidence isolates analyze-stage optional benchmark signal overhead.",
      "Lighthouse execution cost is intentionally excluded to keep the measurement deterministic and local.",
      "Benchmark fixtures include accepted and stale records to exercise conservative policy rejection counters.",
    ],
  };

  await writeJson(args.outJsonPath, report);
  await writeFile(args.outMarkdownPath, toMarkdown(report), "utf8");
  return report;
}

async function main(): Promise<void> {
  const args = parseArgs(process.argv.slice(2));
  const report = await writeOptionalInputOverheadEvidence(args);
  console.log(`[workstream-j-overhead] status=${report.status} iterations=${report.iterations}`);
  console.log(`[workstream-j-overhead] report: ${args.outJsonPath}`);
  console.log(`[workstream-j-overhead] summary: ${args.outMarkdownPath}`);
  if (report.status !== "pass") {
    process.exitCode = 1;
  }
}

if (process.argv[1] !== undefined && resolve(process.argv[1]) === resolve(SCRIPT_PATH)) {
  void main().catch((error: unknown) => {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  });
}

export type { CliArgs, EvidenceReport };
export { parseArgs, writeOptionalInputOverheadEvidence };
