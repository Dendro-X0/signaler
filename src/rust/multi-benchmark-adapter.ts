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
  readonly enabled: boolean;
  readonly used: boolean;
  readonly loaded?: MultiBenchmarkSignalsLoaded;
  readonly sidecarElapsedMs?: number;
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

export async function loadMultiBenchmarkSignalsWithRust(paths: readonly string[]): Promise<RustBenchmarkAttempt> {
  const fallbackLoaded: MultiBenchmarkSignalsLoaded | undefined = await loadMultiBenchmarkSignalsFromFiles(paths);
  if (!isRustBenchmarkEnabled()) {
    return {
      enabled: false,
      used: false,
      loaded: fallbackLoaded,
    };
  }
  if (!fallbackLoaded) {
    return {
      enabled: false,
      used: false,
      loaded: undefined,
    };
  }

  const tempDir: string = await mkdtemp(join(tmpdir(), "signaler-rust-benchmark-"));
  const inPath: string = resolve(tempDir, "in.json");
  const outPath: string = resolve(tempDir, "out.json");
  const input: RustBenchmarkNormalizeInput = {
    schemaVersion: 1,
    inputFiles: [...fallbackLoaded.inputFiles],
  };

  try {
    await writeFile(inPath, JSON.stringify(input, null, 2), "utf8");
    const run = await runRustSidecar({
      args: ["normalize-benchmark-signals", "--in", inPath, "--out", outPath],
      timeoutMs: 90_000,
    });
    if (!run.ok) {
      return {
        enabled: true,
        used: false,
        loaded: fallbackLoaded,
        sidecarElapsedMs: run.elapsedMs,
        fallbackReason: normalizeFallbackReason(run.errorMessage ?? "Rust benchmark normalizer failed."),
      };
    }
    const rawText: string = await readFile(outPath, "utf8");
    const parsedRaw: unknown = JSON.parse(rawText) as unknown;
    const parsed = validateRustBenchmarkNormalizeOutput(parsedRaw);
    const mapped = mapRustOutputToLoaded(parsed);
    if (!mapped) {
      return {
        enabled: true,
        used: false,
        loaded: fallbackLoaded,
        sidecarElapsedMs: run.elapsedMs,
        fallbackReason: "Rust benchmark normalizer produced invalid output payload.",
      };
    }
    return {
      enabled: true,
      used: true,
      loaded: mapped,
      sidecarElapsedMs: run.elapsedMs,
    };
  } catch (error) {
    return {
      enabled: true,
      used: false,
      loaded: fallbackLoaded,
      fallbackReason: normalizeFallbackReason(error instanceof Error ? error.message : "Rust benchmark normalizer crashed."),
    };
  } finally {
    await rm(tempDir, { recursive: true, force: true });
  }
}
