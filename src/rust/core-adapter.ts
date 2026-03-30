import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { join, resolve } from "node:path";
import { tmpdir } from "node:os";
import type { RunnerModeV3, RunnerProfileV3 } from "../contracts/v3/run-v3.js";
import type { SuggestionV3 } from "../contracts/v3/suggestions-v3.js";
import { runRustSidecar } from "./bridge.js";
import {
  type ReduceSignalsInput,
  type ReduceSignalsOutput,
  type ReduceSignalsTopIssue,
  type RunCoreInput,
  type RunCoreOutput,
  validateReduceSignalsOutput,
  validateRunCoreOutput,
} from "./core-contracts.js";

function parseRustCoreFlag(): boolean {
  const raw: string | undefined = process.env.SIGNALER_RUST_CORE;
  if (raw === "0") {
    return false;
  }
  if (raw === "1") {
    return true;
  }
  return true;
}

function normalizeFallbackReason(message: string): string {
  const compact: string = message.replace(/\s+/g, " ").trim();
  if (compact.length <= 240) {
    return compact;
  }
  return `${compact.slice(0, 237)}...`;
}

export type RustCoreRunAttempt = {
  readonly enabled: boolean;
  readonly used: boolean;
  readonly output?: RunCoreOutput;
  readonly sidecarElapsedMs?: number;
  readonly fallbackReason?: string;
};

export type RustReduceSignalsAttempt = {
  readonly enabled: boolean;
  readonly used: boolean;
  readonly topIssues?: readonly ReduceSignalsTopIssue[];
  readonly suggestions?: readonly SuggestionV3[];
  readonly sidecarElapsedMs?: number;
  readonly fallbackReason?: string;
};

export async function runRustCorePipeline(params: {
  readonly input: RunCoreInput;
  readonly timeoutMs?: number;
}): Promise<RustCoreRunAttempt> {
  if (!parseRustCoreFlag()) {
    return { enabled: false, used: false };
  }

  const tempDir: string = await mkdtemp(join(tmpdir(), "signaler-rust-core-run-"));
  const inPath: string = resolve(tempDir, "in.json");
  const outPath: string = resolve(tempDir, "out.json");

  try {
    await writeFile(inPath, JSON.stringify(params.input, null, 2), "utf8");
    const run = await runRustSidecar({ args: ["run-core", "--in", inPath, "--out", outPath], timeoutMs: params.timeoutMs ?? 180_000 });
    if (!run.ok) {
      return {
        enabled: true,
        used: false,
        sidecarElapsedMs: run.elapsedMs,
        fallbackReason: normalizeFallbackReason(run.errorMessage ?? "Rust core runner failed."),
      };
    }
    const rawText: string = await readFile(outPath, "utf8");
    const parsedRaw: unknown = JSON.parse(rawText) as unknown;
    const parsed: RunCoreOutput | undefined = validateRunCoreOutput(parsedRaw);
    if (!parsed) {
      return {
        enabled: true,
        used: false,
        sidecarElapsedMs: run.elapsedMs,
        fallbackReason: "Rust core runner produced invalid output payload.",
      };
    }
    return {
      enabled: true,
      used: true,
      sidecarElapsedMs: run.elapsedMs,
      output: parsed,
    };
  } catch (error) {
    return {
      enabled: true,
      used: false,
      fallbackReason: normalizeFallbackReason(error instanceof Error ? error.message : "Rust core runner crashed."),
    };
  } finally {
    await rm(tempDir, { recursive: true, force: true });
  }
}

export async function runRustSignalReducer(params: {
  readonly summaryPath: string;
  readonly protocol: {
    readonly mode: RunnerModeV3;
    readonly profile: RunnerProfileV3;
    readonly comparabilityHash: string;
  };
  readonly policy?: {
    readonly zeroImpactFilter?: boolean;
    readonly minConfidence?: "high" | "medium" | "low";
    readonly maxSuggestions?: number;
  };
  readonly timeoutMs?: number;
}): Promise<RustReduceSignalsAttempt> {
  if (!parseRustCoreFlag()) {
    return { enabled: false, used: false };
  }

  const tempDir: string = await mkdtemp(join(tmpdir(), "signaler-rust-core-reducer-"));
  const inPath: string = resolve(tempDir, "in.json");
  const outPath: string = resolve(tempDir, "out.json");

  const input: ReduceSignalsInput = {
    schemaVersion: 1,
    summaryPath: params.summaryPath,
    protocol: {
      mode: params.protocol.mode,
      profile: params.protocol.profile,
      comparabilityHash: params.protocol.comparabilityHash,
    },
    policy: {
      zeroImpactFilter: params.policy?.zeroImpactFilter ?? true,
      minConfidence: params.policy?.minConfidence ?? "medium",
      maxSuggestions: Math.max(1, Math.min(100, params.policy?.maxSuggestions ?? 50)),
    },
  };

  try {
    await writeFile(inPath, JSON.stringify(input, null, 2), "utf8");
    const run = await runRustSidecar({ args: ["reduce-signals", "--in", inPath, "--out", outPath], timeoutMs: params.timeoutMs ?? 90_000 });
    if (!run.ok) {
      return {
        enabled: true,
        used: false,
        sidecarElapsedMs: run.elapsedMs,
        fallbackReason: normalizeFallbackReason(run.errorMessage ?? "Rust signal reducer failed."),
      };
    }
    const rawText: string = await readFile(outPath, "utf8");
    const parsedRaw: unknown = JSON.parse(rawText) as unknown;
    const parsed: ReduceSignalsOutput | undefined = validateReduceSignalsOutput(parsedRaw);
    if (!parsed) {
      return {
        enabled: true,
        used: false,
        sidecarElapsedMs: run.elapsedMs,
        fallbackReason: "Rust signal reducer produced invalid output payload.",
      };
    }
    return {
      enabled: true,
      used: true,
      sidecarElapsedMs: run.elapsedMs,
      topIssues: parsed.topIssues,
      suggestions: parsed.suggestions,
    };
  } catch (error) {
    return {
      enabled: true,
      used: false,
      fallbackReason: normalizeFallbackReason(error instanceof Error ? error.message : "Rust signal reducer crashed."),
    };
  } finally {
    await rm(tempDir, { recursive: true, force: true });
  }
}
