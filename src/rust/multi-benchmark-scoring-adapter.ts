import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { join, resolve } from "node:path";
import { tmpdir } from "node:os";
import type { MultiBenchmarkAcceptedRecord, MultiBenchmarkMatchResult } from "../multi-benchmark-signals.js";
import { matchAcceptedMultiBenchmarkSignals } from "../multi-benchmark-signals.js";
import { runRustSidecar } from "./bridge.js";
import {
  type RustBenchmarkNormalizeRecord,
  type RustBenchmarkScoreInput,
  validateRustBenchmarkScoreOutput,
} from "./multi-benchmark-contracts.js";

function isRustBenchmarkEnabled(): boolean {
  return process.env.SIGNALER_RUST_BENCHMARK === "1";
}

function normalizeFallbackReason(message: string): string {
  const compact: string = message.replace(/\s+/g, " ").trim();
  if (compact.length <= 240) return compact;
  return `${compact.slice(0, 237)}...`;
}

type RustBenchmarkScoreCandidate = {
  readonly candidateId: string;
  readonly issueId: string;
  readonly allowedPaths?: readonly string[];
};

type RustBenchmarkScoreAttempt = {
  readonly requested: boolean;
  readonly enabled: boolean;
  readonly used: boolean;
  readonly scores: ReadonlyMap<string, MultiBenchmarkMatchResult>;
  readonly sidecarElapsedMs?: number;
  readonly sidecarCommand?: "score-benchmark" | "score-benchmark-signals";
  readonly matchedRecordsCount?: number;
  readonly fallbackReason?: string;
};

function normalizeAllowedPaths(paths: readonly string[] | undefined): readonly string[] | undefined {
  if (!Array.isArray(paths) || paths.length === 0) return undefined;
  const seen = new Set<string>();
  const deduped: string[] = [];
  for (const row of paths) {
    if (typeof row !== "string" || row.length === 0) continue;
    if (seen.has(row)) continue;
    seen.add(row);
    deduped.push(row);
  }
  return deduped.length === 0 ? undefined : deduped;
}

function normalizeMetricsRecord(metrics: MultiBenchmarkAcceptedRecord["metrics"]): Record<string, number> | undefined {
  if (!metrics || typeof metrics !== "object") return undefined;
  const normalized: Record<string, number> = {};
  for (const [key, value] of Object.entries(metrics as Record<string, unknown>)) {
    if (typeof value === "number" && Number.isFinite(value)) {
      normalized[key] = value;
    }
  }
  return Object.keys(normalized).length > 0 ? normalized : undefined;
}

function toRustAcceptedRecord(record: MultiBenchmarkAcceptedRecord): RustBenchmarkNormalizeRecord {
  const normalizedMetrics = normalizeMetricsRecord(record.metrics);
  return {
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
    evidence: record.evidence.map((row) => ({
      sourceRelPath: row.sourceRelPath,
      pointer: row.pointer,
      ...(row.artifactRelPath !== undefined ? { artifactRelPath: row.artifactRelPath } : {}),
    })),
    ...(normalizedMetrics !== undefined ? { metrics: normalizedMetrics } : {}),
  };
}

function scoreWithNode(params: {
  readonly accepted: readonly MultiBenchmarkAcceptedRecord[];
  readonly candidates: readonly RustBenchmarkScoreCandidate[];
}): Map<string, MultiBenchmarkMatchResult> {
  const out = new Map<string, MultiBenchmarkMatchResult>();
  for (const candidate of params.candidates) {
    out.set(
      candidate.candidateId,
      matchAcceptedMultiBenchmarkSignals({
        accepted: params.accepted,
        issueId: candidate.issueId,
        allowedPaths: normalizeAllowedPaths(candidate.allowedPaths),
      }),
    );
  }
  return out;
}

async function runRustScoring(params: {
  readonly inPath: string;
  readonly outPath: string;
}): Promise<{
  readonly ok: boolean;
  readonly command?: "score-benchmark" | "score-benchmark-signals";
  readonly elapsedMs?: number;
  readonly scores?: ReadonlyMap<string, MultiBenchmarkMatchResult>;
  readonly matchedRecordsCount?: number;
  readonly errorMessage?: string;
}> {
  const commands: readonly ("score-benchmark" | "score-benchmark-signals")[] = ["score-benchmark", "score-benchmark-signals"];
  let lastError: string | undefined;
  let lastElapsedMs: number | undefined;

  for (const command of commands) {
    const run = await runRustSidecar({
      args: [command, "--in", params.inPath, "--out", params.outPath],
      timeoutMs: 90_000,
    });
    lastElapsedMs = run.elapsedMs;
    if (!run.ok) {
      lastError = run.errorMessage ?? `Rust benchmark scoring command failed: ${command}`;
      continue;
    }

    let parsedRaw: unknown;
    try {
      const rawText = await readFile(params.outPath, "utf8");
      parsedRaw = JSON.parse(rawText) as unknown;
    } catch (error) {
      return {
        ok: false,
        command,
        elapsedMs: run.elapsedMs,
        errorMessage: `Rust benchmark scoring output parse failed: ${error instanceof Error ? error.message : String(error)}`,
      };
    }
    const parsed = validateRustBenchmarkScoreOutput(parsedRaw);
    if (!parsed) {
      return {
        ok: false,
        command,
        elapsedMs: run.elapsedMs,
        errorMessage: "Rust benchmark scoring produced invalid output payload.",
      };
    }
    const map = new Map<string, MultiBenchmarkMatchResult>();
    for (const row of parsed.results) {
      map.set(row.candidateId, {
        totalBoost: row.totalBoost,
        sourceBoosts: row.sourceBoosts,
        evidence: row.evidence,
      });
    }
    return {
      ok: true,
      command,
      elapsedMs: run.elapsedMs,
      scores: map,
      matchedRecordsCount: parsed.stats.matchedRecordsCount,
    };
  }

  return {
    ok: false,
    elapsedMs: lastElapsedMs,
    errorMessage: lastError ?? "Rust benchmark scoring failed.",
  };
}

async function scoreMultiBenchmarkWithRust(params: {
  readonly accepted: readonly MultiBenchmarkAcceptedRecord[];
  readonly candidates: readonly RustBenchmarkScoreCandidate[];
}): Promise<RustBenchmarkScoreAttempt> {
  const requested: boolean = params.accepted.length > 0 && params.candidates.length > 0;
  if (!requested) {
    return {
      requested: false,
      enabled: false,
      used: false,
      scores: new Map<string, MultiBenchmarkMatchResult>(),
    };
  }

  if (!isRustBenchmarkEnabled()) {
    return {
      requested: true,
      enabled: false,
      used: false,
      scores: scoreWithNode(params),
    };
  }

  const tempDir: string = await mkdtemp(join(tmpdir(), "signaler-rust-benchmark-score-"));
  const inPath: string = resolve(tempDir, "in.json");
  const outPath: string = resolve(tempDir, "out.json");
  const normalizedCandidates = params.candidates.map((row) => {
    const normalizedAllowedPaths = normalizeAllowedPaths(row.allowedPaths);
    return {
      candidateId: row.candidateId,
      issueId: row.issueId,
      ...(normalizedAllowedPaths !== undefined
        ? { allowedPaths: normalizedAllowedPaths }
        : {}),
    };
  });
  const input: RustBenchmarkScoreInput = {
    schemaVersion: 1,
    acceptedRecords: params.accepted.map((row) => toRustAcceptedRecord(row)),
    candidates: normalizedCandidates,
  };

  try {
    await writeFile(inPath, JSON.stringify(input), "utf8");
    const rustResult = await runRustScoring({ inPath, outPath });
    if (rustResult.ok && rustResult.scores) {
      return {
        requested: true,
        enabled: true,
        used: true,
        scores: rustResult.scores,
        sidecarElapsedMs: rustResult.elapsedMs,
        sidecarCommand: rustResult.command,
        matchedRecordsCount: rustResult.matchedRecordsCount,
      };
    }
    return {
      requested: true,
      enabled: true,
      used: false,
      scores: scoreWithNode(params),
      sidecarElapsedMs: rustResult.elapsedMs,
      sidecarCommand: rustResult.command,
      fallbackReason: normalizeFallbackReason(rustResult.errorMessage ?? "Rust benchmark scoring failed."),
    };
  } catch (error) {
    return {
      requested: true,
      enabled: true,
      used: false,
      scores: scoreWithNode(params),
      fallbackReason: normalizeFallbackReason(error instanceof Error ? error.message : "Rust benchmark scoring crashed."),
    };
  } finally {
    await rm(tempDir, { recursive: true, force: true });
  }
}

export type { RustBenchmarkScoreAttempt, RustBenchmarkScoreCandidate };
export { scoreMultiBenchmarkWithRust };
