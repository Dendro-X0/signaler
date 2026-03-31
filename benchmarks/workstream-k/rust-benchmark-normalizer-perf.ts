import { createHash } from "node:crypto";
import { mkdir, rm, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { performance } from "node:perf_hooks";
import { fileURLToPath } from "node:url";
import type { MultiBenchmarkSourceIdV1 } from "../../src/contracts/multi-benchmark-v1.js";
import type { MultiBenchmarkSignalsLoaded } from "../../src/multi-benchmark-signals.js";
import { loadMultiBenchmarkSignalsFromFiles } from "../../src/multi-benchmark-signals.js";
import type { RustBenchmarkAttempt } from "../../src/rust/multi-benchmark-adapter.js";
import { loadMultiBenchmarkSignalsWithRust } from "../../src/rust/multi-benchmark-adapter.js";

type CaseId = "node" | "rust";

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
  readonly recordsCountMean: number;
  readonly uniqueOutputDigests: readonly string[];
  readonly rust?: {
    readonly usedIterations: number;
    readonly fallbackIterations: number;
    readonly sidecarCommands: readonly string[];
    readonly fallbackReasons: readonly string[];
  };
};

type EvidenceReport = {
  readonly schemaVersion: 1;
  readonly generatedAt: string;
  readonly status: "pass" | "fail";
  readonly workspaceDir: string;
  readonly iterations: number;
  readonly recordsPerSource: number;
  readonly fixture: {
    readonly sourceCount: number;
    readonly inputRecordsCount: number;
    readonly inputFiles: readonly string[];
  };
  readonly cases: {
    readonly node: CaseReport;
    readonly rust: CaseReport;
  };
  readonly delta: {
    readonly medianMs: number;
    readonly p95Ms: number;
    readonly medianPct: number;
    readonly p95Pct: number;
  };
  readonly assertions: {
    readonly nodeOutputStable: boolean;
    readonly rustOutputStable: boolean;
    readonly parityMatched: boolean;
    readonly rustUsedEveryIteration: boolean;
  };
  readonly notes: readonly string[];
};

type CliArgs = {
  readonly outJsonPath: string;
  readonly outMarkdownPath: string;
  readonly workspaceDir: string;
  readonly iterations: number;
  readonly recordsPerSource: number;
};

type PerfDeps = {
  readonly now: () => number;
  readonly loadNode: (paths: readonly string[]) => Promise<MultiBenchmarkSignalsLoaded | undefined>;
  readonly loadRust: (paths: readonly string[]) => Promise<RustBenchmarkAttempt>;
};

type FixtureInfo = {
  readonly inputFiles: readonly string[];
  readonly sourceCount: number;
  readonly inputRecordsCount: number;
};

const SCRIPT_PATH = fileURLToPath(import.meta.url);
const ROOT = resolve(SCRIPT_PATH, "..", "..", "..");
const DAY_MS = 24 * 60 * 60 * 1000;
const SOURCE_IDS: readonly MultiBenchmarkSourceIdV1[] = [
  "accessibility-extended",
  "security-baseline",
  "seo-technical",
  "reliability-slo",
  "cross-browser-parity",
] as const;

function parseIntegerFlag(name: string, raw: string, min: number): number {
  const value = Number.parseInt(raw, 10);
  if (!Number.isFinite(value) || value < min) {
    throw new Error(`Invalid ${name}: ${raw}. Expected integer >= ${min}.`);
  }
  return value;
}

function parseArgs(argv: readonly string[]): CliArgs {
  let outJsonPath = resolve(ROOT, "benchmarks", "out", "workstream-k-rust-benchmark-normalizer-perf.json");
  let outMarkdownPath = resolve(ROOT, "benchmarks", "out", "workstream-k-rust-benchmark-normalizer-perf.md");
  let workspaceDir = resolve(ROOT, "benchmarks", "workspaces", "workstream-k-rust-benchmark-normalizer-perf");
  let iterations = 6;
  let recordsPerSource = 200;

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
    if (arg === "--records-per-source" && i + 1 < argv.length) {
      recordsPerSource = parseIntegerFlag("--records-per-source", argv[i + 1] ?? "", 1);
      i += 1;
      continue;
    }
    if (arg.startsWith("--records-per-source=")) {
      recordsPerSource = parseIntegerFlag("--records-per-source", arg.slice("--records-per-source=".length), 1);
      continue;
    }
  }

  return { outJsonPath, outMarkdownPath, workspaceDir, iterations, recordsPerSource };
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

async function writeJson(pathToFile: string, value: unknown): Promise<void> {
  await mkdir(dirname(pathToFile), { recursive: true });
  await writeFile(pathToFile, `${JSON.stringify(value, null, 2)}\n`, "utf8");
}

function toFreshIso(daysAgo: number): string {
  return new Date(Date.now() - daysAgo * DAY_MS).toISOString();
}

function metricValue(seed: number, offset: number, max: number): number {
  return ((seed * 37 + offset * 11) % max) + 1;
}

function buildMetrics(sourceId: MultiBenchmarkSourceIdV1, seed: number): Record<string, number> {
  if (sourceId === "accessibility-extended") {
    return {
      wcagViolationCount: metricValue(seed, 1, 9),
      seriousViolationCount: metricValue(seed, 2, 5),
      criticalViolationCount: metricValue(seed, 3, 3),
      apgPatternMismatchCount: metricValue(seed, 4, 4),
    };
  }
  if (sourceId === "security-baseline") {
    return {
      missingHeaderCount: metricValue(seed, 1, 8),
      tlsConfigIssueCount: metricValue(seed, 2, 4),
      cookiePolicyIssueCount: metricValue(seed, 3, 6),
      mixedContentCount: metricValue(seed, 4, 3),
    };
  }
  if (sourceId === "seo-technical") {
    return {
      indexabilityIssueCount: metricValue(seed, 1, 8),
      canonicalMismatchCount: metricValue(seed, 2, 4),
      structuredDataErrorCount: metricValue(seed, 3, 5),
      crawlabilityIssueCount: metricValue(seed, 4, 6),
    };
  }
  if (sourceId === "reliability-slo") {
    return {
      availabilityPct: 98 + (metricValue(seed, 1, 200) / 100),
      errorRatePct: metricValue(seed, 2, 50) / 100,
      latencyP95Ms: 150 + metricValue(seed, 3, 900),
    };
  }
  return {
    scoreVariancePct: metricValue(seed, 1, 25) / 10,
    lcpDeltaMs: metricValue(seed, 2, 700),
    clsDelta: metricValue(seed, 3, 30) / 1000,
  };
}

function issueId(seed: number): string {
  const issues = [
    "unused-javascript",
    "server-response-time",
    "render-blocking-resources",
    "uses-long-cache-ttl",
    "largest-contentful-paint",
    "legacy-javascript",
  ] as const;
  return issues[seed % issues.length] ?? "unused-javascript";
}

function pathValue(seed: number): string {
  const paths = ["/", "/docs", "/blog", "/pricing", "/about", "/contact"] as const;
  return paths[seed % paths.length] ?? "/";
}

async function writeFixtures(workspaceDir: string, recordsPerSource: number): Promise<FixtureInfo> {
  const files: string[] = [];
  for (let sourceIndex = 0; sourceIndex < SOURCE_IDS.length; sourceIndex += 1) {
    const sourceId = SOURCE_IDS[sourceIndex] ?? SOURCE_IDS[0];
    const collectedAt = toFreshIso(sourceIndex + 1);
    const filePath = resolve(workspaceDir, `benchmark-${sourceId}.json`);
    const records = Array.from({ length: recordsPerSource }, (_, recordIndex) => {
      const seed = sourceIndex * 100_000 + recordIndex;
      return {
        id: `${sourceId}-${String(recordIndex).padStart(5, "0")}`,
        target: {
          issueId: issueId(seed),
          path: pathValue(seed),
          ...(recordIndex % 2 === 0 ? { device: "mobile" as const } : { device: "desktop" as const }),
        },
        confidence: "high" as const,
        evidence: [
          {
            sourceRelPath: `fixtures/${sourceId}.json`,
            pointer: `/sources/0/records/${recordIndex}`,
          },
          {
            sourceRelPath: `fixtures/${sourceId}.json`,
            pointer: `/sources/0/records/${recordIndex}/details`,
            artifactRelPath: `artifacts/${sourceId}/${recordIndex}.json`,
          },
        ],
        metrics: buildMetrics(sourceId, seed),
      };
    });
    await writeJson(filePath, {
      schemaVersion: 1,
      sources: [{ sourceId, collectedAt, records }],
    });
    files.push(filePath);
  }

  return {
    inputFiles: [...files, files[0] ?? resolve(workspaceDir, "benchmark-missing.json")],
    sourceCount: SOURCE_IDS.length,
    inputRecordsCount: SOURCE_IDS.length * recordsPerSource,
  };
}

function normalizeLoadedDigest(loaded: MultiBenchmarkSignalsLoaded): string {
  const payload = {
    inputFiles: [...loaded.inputFiles].sort((a, b) => a.localeCompare(b)),
    sourceIds: [...loaded.sourceIds].sort((a, b) => a.localeCompare(b)),
    records: [...loaded.records]
      .map((record) => ({
        sourceId: record.sourceId,
        collectedAt: record.collectedAt,
        collectedAtMs: record.collectedAtMs,
        id: record.id,
        target: {
          issueId: record.target.issueId,
          path: record.target.path,
          ...(record.target.device !== undefined ? { device: record.target.device } : {}),
        },
        confidence: record.confidence,
        evidence: [...record.evidence]
          .map((row) => ({
            sourceRelPath: row.sourceRelPath,
            pointer: row.pointer,
            ...(row.artifactRelPath !== undefined ? { artifactRelPath: row.artifactRelPath } : {}),
          }))
          .sort((a, b) => {
            const sourceDelta = a.sourceRelPath.localeCompare(b.sourceRelPath);
            if (sourceDelta !== 0) return sourceDelta;
            const pointerDelta = a.pointer.localeCompare(b.pointer);
            if (pointerDelta !== 0) return pointerDelta;
            return (a.artifactRelPath ?? "").localeCompare(b.artifactRelPath ?? "");
          }),
        metrics: record.metrics === undefined
          ? []
          : Object.entries(record.metrics)
            .sort((a, b) => a[0].localeCompare(b[0])),
      }))
      .sort((a, b) => {
        const sourceDelta = a.sourceId.localeCompare(b.sourceId);
        if (sourceDelta !== 0) return sourceDelta;
        const issueDelta = a.target.issueId.localeCompare(b.target.issueId);
        if (issueDelta !== 0) return issueDelta;
        const pathDelta = a.target.path.localeCompare(b.target.path);
        if (pathDelta !== 0) return pathDelta;
        const deviceDelta = (a.target.device ?? "").localeCompare(b.target.device ?? "");
        if (deviceDelta !== 0) return deviceDelta;
        return a.id.localeCompare(b.id);
      }),
  };
  return createHash("sha256").update(JSON.stringify(payload)).digest("hex");
}

async function runNodeCase(params: {
  readonly iterations: number;
  readonly inputFiles: readonly string[];
  readonly deps: PerfDeps;
}): Promise<CaseReport> {
  const samples: number[] = [];
  const digests: string[] = [];
  let recordsSum = 0;

  for (let i = 0; i < params.iterations; i += 1) {
    const startedAt = params.deps.now();
    const loaded = await params.deps.loadNode(params.inputFiles);
    const elapsedMs = Math.round((params.deps.now() - startedAt) * 100) / 100;
    if (!loaded) {
      throw new Error(`Node benchmark loader returned no records (iteration ${i + 1}).`);
    }
    samples.push(elapsedMs);
    recordsSum += loaded.records.length;
    digests.push(normalizeLoadedDigest(loaded));
  }

  return {
    id: "node",
    elapsedMs: computeTimingStats(samples),
    recordsCountMean: Math.round((recordsSum / params.iterations) * 100) / 100,
    uniqueOutputDigests: [...new Set(digests)].sort((a, b) => a.localeCompare(b)),
  };
}

async function runRustCase(params: {
  readonly iterations: number;
  readonly inputFiles: readonly string[];
  readonly deps: PerfDeps;
}): Promise<CaseReport> {
  const samples: number[] = [];
  const digests: string[] = [];
  const sidecarCommands = new Set<string>();
  const fallbackReasons = new Set<string>();
  let recordsSum = 0;
  let usedIterations = 0;
  let fallbackIterations = 0;

  const previousRustBenchmark = process.env.SIGNALER_RUST_BENCHMARK;
  process.env.SIGNALER_RUST_BENCHMARK = "1";
  try {
    for (let i = 0; i < params.iterations; i += 1) {
      const startedAt = params.deps.now();
      const attempt = await params.deps.loadRust(params.inputFiles);
      const elapsedMs = Math.round((params.deps.now() - startedAt) * 100) / 100;
      if (!attempt.loaded) {
        throw new Error(`Rust benchmark loader returned no records (iteration ${i + 1}).`);
      }
      if (attempt.used) {
        usedIterations += 1;
      } else {
        fallbackIterations += 1;
      }
      if (attempt.sidecarCommand) sidecarCommands.add(attempt.sidecarCommand);
      if (attempt.fallbackReason) fallbackReasons.add(attempt.fallbackReason);

      samples.push(elapsedMs);
      recordsSum += attempt.loaded.records.length;
      digests.push(normalizeLoadedDigest(attempt.loaded));
    }
  } finally {
    if (previousRustBenchmark === undefined) {
      delete process.env.SIGNALER_RUST_BENCHMARK;
    } else {
      process.env.SIGNALER_RUST_BENCHMARK = previousRustBenchmark;
    }
  }

  return {
    id: "rust",
    elapsedMs: computeTimingStats(samples),
    recordsCountMean: Math.round((recordsSum / params.iterations) * 100) / 100,
    uniqueOutputDigests: [...new Set(digests)].sort((a, b) => a.localeCompare(b)),
    rust: {
      usedIterations,
      fallbackIterations,
      sidecarCommands: [...sidecarCommands].sort((a, b) => a.localeCompare(b)),
      fallbackReasons: [...fallbackReasons].sort((a, b) => a.localeCompare(b)),
    },
  };
}

function toMarkdown(report: EvidenceReport): string {
  const lines: string[] = [];
  lines.push("# Workstream K Rust Benchmark Normalizer Perf Evidence");
  lines.push("");
  lines.push(`Generated: ${report.generatedAt}`);
  lines.push(`Status: ${report.status.toUpperCase()}`);
  lines.push(`Workspace: ${report.workspaceDir}`);
  lines.push(`Iterations per case: ${report.iterations}`);
  lines.push(`Records per source: ${report.recordsPerSource}`);
  lines.push("");
  lines.push("## Fixture");
  lines.push("");
  lines.push(`- source files: ${report.fixture.sourceCount}`);
  lines.push(`- input records: ${report.fixture.inputRecordsCount}`);
  lines.push(`- input files (dedupe exercised): ${report.fixture.inputFiles.length}`);
  lines.push("");
  lines.push("## Timing");
  lines.push("");
  lines.push("| Case | Mean (ms) | Median (ms) | P95 (ms) | Min (ms) | Max (ms) |");
  lines.push("| --- | --- | --- | --- | --- | --- |");
  lines.push(
    `| node-normalizer | ${report.cases.node.elapsedMs.meanMs} | ${report.cases.node.elapsedMs.medianMs} | ${report.cases.node.elapsedMs.p95Ms} | ${report.cases.node.elapsedMs.minMs} | ${report.cases.node.elapsedMs.maxMs} |`,
  );
  lines.push(
    `| rust-normalizer | ${report.cases.rust.elapsedMs.meanMs} | ${report.cases.rust.elapsedMs.medianMs} | ${report.cases.rust.elapsedMs.p95Ms} | ${report.cases.rust.elapsedMs.minMs} | ${report.cases.rust.elapsedMs.maxMs} |`,
  );
  lines.push("");
  lines.push("## Delta");
  lines.push("");
  lines.push(`- median delta (rust - node): ${report.delta.medianMs}ms (${report.delta.medianPct}%)`);
  lines.push(`- p95 delta (rust - node): ${report.delta.p95Ms}ms (${report.delta.p95Pct}%)`);
  lines.push("");
  lines.push("## Rust Usage");
  lines.push("");
  lines.push(`- rust used iterations: ${report.cases.rust.rust?.usedIterations ?? 0}/${report.iterations}`);
  lines.push(`- rust fallback iterations: ${report.cases.rust.rust?.fallbackIterations ?? 0}/${report.iterations}`);
  lines.push(`- sidecar commands: ${(report.cases.rust.rust?.sidecarCommands ?? []).join(", ") || "(none)"}`);
  lines.push(`- fallback reasons: ${(report.cases.rust.rust?.fallbackReasons ?? []).join(" | ") || "(none)"}`);
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

async function writeRustBenchmarkNormalizerPerfEvidence(
  args: CliArgs,
  depsOverride?: Partial<PerfDeps>,
): Promise<EvidenceReport> {
  await rm(args.workspaceDir, { recursive: true, force: true });
  await mkdir(args.workspaceDir, { recursive: true });
  const fixture = await writeFixtures(args.workspaceDir, args.recordsPerSource);

  const deps: PerfDeps = {
    now: depsOverride?.now ?? (() => performance.now()),
    loadNode: depsOverride?.loadNode ?? ((paths) => loadMultiBenchmarkSignalsFromFiles(paths)),
    loadRust: depsOverride?.loadRust ?? ((paths) => loadMultiBenchmarkSignalsWithRust(paths)),
  };

  const nodeCase = await runNodeCase({
    iterations: args.iterations,
    inputFiles: fixture.inputFiles,
    deps,
  });
  const rustCase = await runRustCase({
    iterations: args.iterations,
    inputFiles: fixture.inputFiles,
    deps,
  });

  const medianDeltaMs = Math.round((rustCase.elapsedMs.medianMs - nodeCase.elapsedMs.medianMs) * 100) / 100;
  const p95DeltaMs = Math.round((rustCase.elapsedMs.p95Ms - nodeCase.elapsedMs.p95Ms) * 100) / 100;
  const medianPct = percentDelta(medianDeltaMs, nodeCase.elapsedMs.medianMs);
  const p95Pct = percentDelta(p95DeltaMs, nodeCase.elapsedMs.p95Ms);

  const nodeDigest = nodeCase.uniqueOutputDigests[0] ?? "";
  const rustDigest = rustCase.uniqueOutputDigests[0] ?? "";
  const assertions = {
    nodeOutputStable: nodeCase.uniqueOutputDigests.length === 1,
    rustOutputStable: rustCase.uniqueOutputDigests.length === 1,
    parityMatched: nodeDigest.length > 0 && nodeDigest === rustDigest,
    rustUsedEveryIteration: (rustCase.rust?.usedIterations ?? 0) === args.iterations,
  } as const;
  const status: EvidenceReport["status"] = Object.values(assertions).every(Boolean) ? "pass" : "fail";

  const report: EvidenceReport = {
    schemaVersion: 1,
    generatedAt: new Date().toISOString(),
    status,
    workspaceDir: args.workspaceDir,
    iterations: args.iterations,
    recordsPerSource: args.recordsPerSource,
    fixture,
    cases: {
      node: nodeCase,
      rust: rustCase,
    },
    delta: {
      medianMs: medianDeltaMs,
      p95Ms: p95DeltaMs,
      medianPct,
      p95Pct,
    },
    assertions,
    notes: [
      "This evidence compares benchmark-signal normalization cost only (no Lighthouse run cost included).",
      "Output parity is verified by deterministic digest comparison of normalized records.",
      "Status is fail when Rust falls back in any iteration, which indicates sidecar execution was unavailable for this run.",
    ],
  };

  await writeJson(args.outJsonPath, report);
  await writeFile(args.outMarkdownPath, toMarkdown(report), "utf8");
  return report;
}

async function main(): Promise<void> {
  const args = parseArgs(process.argv.slice(2));
  const report = await writeRustBenchmarkNormalizerPerfEvidence(args);
  console.log(`[workstream-k-rust-benchmark] status=${report.status} iterations=${report.iterations}`);
  console.log(`[workstream-k-rust-benchmark] report: ${args.outJsonPath}`);
  console.log(`[workstream-k-rust-benchmark] summary: ${args.outMarkdownPath}`);
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

export type { CliArgs, EvidenceReport, PerfDeps };
export { parseArgs, writeRustBenchmarkNormalizerPerfEvidence };
