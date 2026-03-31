import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { join, resolve } from "node:path";
import { tmpdir } from "node:os";
import type { MultiBenchmarkSignalsLoaded } from "../multi-benchmark-signals.js";
import { loadMultiBenchmarkSignalsFromFiles } from "../multi-benchmark-signals.js";
import { runRustSidecar } from "./bridge.js";
import { type RustBenchmarkNormalizeInput, validateRustBenchmarkNormalizeOutput } from "./multi-benchmark-contracts.js";

function isRustBenchmarkEnabled(): boolean {
  return process.env.SIGNALER_RUST_BENCHMARK === "1";
}

function normalizeFallbackReason(message: string): string {
  const compact: string = message.replace(/\s+/g, " ").trim();
  if (compact.length <= 240) return compact;
  return `${compact.slice(0, 237)}...`;
}

export type RustBenchmarkAttempt = {
  readonly requested: boolean;
  readonly enabled: boolean;
  readonly used: boolean;
  readonly loaded?: MultiBenchmarkSignalsLoaded;
  readonly sidecarElapsedMs?: number;
  readonly sidecarCommand?: "normalize-benchmark" | "normalize-benchmark-signals";
  readonly normalizeStats?: {
    readonly recordsCount: number;
    readonly inputRecordsCount?: number;
    readonly dedupedRecordsCount?: number;
    readonly recordsDigest?: string;
  };
  readonly fallbackReason?: string;
};

function mapRustOutputToLoaded(raw: ReturnType<typeof validateRustBenchmarkNormalizeOutput>): MultiBenchmarkSignalsLoaded | undefined {
  if (!raw) return undefined;
  return {
    inputFiles: raw.inputFiles,
    sourceIds: raw.sourceIds,
    records: raw.records,
  };
}

function normalizeInputFiles(paths: readonly string[]): readonly string[] {
  const deduped: string[] = [];
  const seen = new Set<string>();
  for (const row of paths) {
    const normalized = resolve(row).replace(/\\/g, "/");
    if (seen.has(normalized)) continue;
    seen.add(normalized);
    deduped.push(normalized);
  }
  return deduped;
}

async function runRustNormalizer(params: {
  readonly inPath: string;
  readonly outPath: string;
}): Promise<{
  readonly ok: boolean;
  readonly command?: "normalize-benchmark" | "normalize-benchmark-signals";
  readonly elapsedMs?: number;
  readonly loaded?: MultiBenchmarkSignalsLoaded;
  readonly normalizeStats?: RustBenchmarkAttempt["normalizeStats"];
  readonly errorMessage?: string;
}> {
  const commands: readonly ("normalize-benchmark" | "normalize-benchmark-signals")[] = ["normalize-benchmark", "normalize-benchmark-signals"];
  let lastError: string | undefined;
  let lastElapsedMs: number | undefined;

  for (const command of commands) {
    const run = await runRustSidecar({
      args: [command, "--in", params.inPath, "--out", params.outPath],
      timeoutMs: 90_000,
    });
    lastElapsedMs = run.elapsedMs;
    if (!run.ok) {
      lastError = run.errorMessage ?? `Rust benchmark normalizer command failed: ${command}`;
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
        errorMessage: `Rust benchmark normalizer output parse failed: ${error instanceof Error ? error.message : String(error)}`,
      };
    }

    const parsed = validateRustBenchmarkNormalizeOutput(parsedRaw);
    const mapped = mapRustOutputToLoaded(parsed);
    if (!mapped || !parsed) {
      return {
        ok: false,
        command,
        elapsedMs: run.elapsedMs,
        errorMessage: "Rust benchmark normalizer produced invalid output payload.",
      };
    }
    return {
      ok: true,
      command,
      elapsedMs: run.elapsedMs,
      loaded: mapped,
      normalizeStats: {
        recordsCount: parsed.stats.recordsCount,
        ...(typeof parsed.stats.inputRecordsCount === "number" ? { inputRecordsCount: parsed.stats.inputRecordsCount } : {}),
        ...(typeof parsed.stats.dedupedRecordsCount === "number" ? { dedupedRecordsCount: parsed.stats.dedupedRecordsCount } : {}),
        ...(typeof parsed.stats.recordsDigest === "string" ? { recordsDigest: parsed.stats.recordsDigest } : {}),
      },
    };
  }

  return {
    ok: false,
    elapsedMs: lastElapsedMs,
    errorMessage: lastError ?? "Rust benchmark normalizer failed.",
  };
}

export async function loadMultiBenchmarkSignalsWithRust(paths: readonly string[]): Promise<RustBenchmarkAttempt> {
  const normalizedInputFiles = normalizeInputFiles(paths);
  const requested = normalizedInputFiles.length > 0;
  if (!requested) {
    return {
      requested: false,
      enabled: false,
      used: false,
      loaded: undefined,
    };
  }

  if (!isRustBenchmarkEnabled()) {
    return {
      requested: true,
      enabled: false,
      used: false,
      loaded: await loadMultiBenchmarkSignalsFromFiles(normalizedInputFiles),
    };
  }

  const tempDir: string = await mkdtemp(join(tmpdir(), "signaler-rust-benchmark-"));
  const inPath: string = resolve(tempDir, "in.json");
  const outPath: string = resolve(tempDir, "out.json");
  const input: RustBenchmarkNormalizeInput = {
    schemaVersion: 1,
    inputFiles: [...normalizedInputFiles],
  };

  try {
    await writeFile(inPath, JSON.stringify(input, null, 2), "utf8");
    const rustResult = await runRustNormalizer({
      inPath,
      outPath,
    });
    if (rustResult.ok && rustResult.loaded) {
      return {
        requested: true,
        enabled: true,
        used: true,
        loaded: rustResult.loaded,
        sidecarElapsedMs: rustResult.elapsedMs,
        sidecarCommand: rustResult.command,
        normalizeStats: rustResult.normalizeStats,
      };
    }
    const fallbackLoaded = await loadMultiBenchmarkSignalsFromFiles(normalizedInputFiles);
    return {
      requested: true,
      enabled: true,
      used: false,
      loaded: fallbackLoaded,
      sidecarElapsedMs: rustResult.elapsedMs,
      sidecarCommand: rustResult.command,
      fallbackReason: normalizeFallbackReason(rustResult.errorMessage ?? "Rust benchmark normalizer failed."),
    };
  } catch (error) {
    let fallbackLoaded: MultiBenchmarkSignalsLoaded | undefined;
    try {
      fallbackLoaded = await loadMultiBenchmarkSignalsFromFiles(normalizedInputFiles);
    } catch {
      throw error;
    }
    return {
      requested: true,
      enabled: true,
      used: false,
      loaded: fallbackLoaded,
      fallbackReason: normalizeFallbackReason(error instanceof Error ? error.message : "Rust benchmark normalizer crashed."),
    };
  } finally {
    await rm(tempDir, { recursive: true, force: true });
  }
}
