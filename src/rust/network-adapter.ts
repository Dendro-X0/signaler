import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { isRustFeatureEnabled, runRustSidecar } from "./bridge.js";
import type { RustNetworkInput, RustNetworkMode, RustNetworkOutput, RustNetworkTask } from "./network-contracts.js";
import { validateRustNetworkOutput } from "./network-contracts.js";

export type RustNetworkAttempt<ResultT extends RustNetworkTask> = {
  readonly enabled: boolean;
  readonly requested: boolean;
  readonly used: boolean;
  readonly output?: {
    readonly status: RustNetworkOutput["status"];
    readonly elapsedMs: number;
    readonly usedFallbackSafeDefaults: boolean;
    readonly stats: RustNetworkOutput["stats"];
    readonly results: readonly ResultT[];
  };
  readonly fallbackReason?: string;
  readonly sidecarElapsedMs?: number;
};

const MODE_FLAG: Record<RustNetworkMode, "SIGNALER_RUST_HEALTH" | "SIGNALER_RUST_HEADERS" | "SIGNALER_RUST_LINKS" | "SIGNALER_RUST_CONSOLE"> = {
  health: "SIGNALER_RUST_HEALTH",
  headers: "SIGNALER_RUST_HEADERS",
  links: "SIGNALER_RUST_LINKS",
  console: "SIGNALER_RUST_CONSOLE",
};

function parseFlag(value: string | undefined): boolean | undefined {
  if (value === "1") {
    return true;
  }
  if (value === "0") {
    return false;
  }
  return undefined;
}

function normalizeFallbackReason(message: string): string {
  const compact: string = message.replace(/\s+/g, " ").trim();
  if (compact.length <= 240) {
    return compact;
  }
  return `${compact.slice(0, 237)}...`;
}

export function isRustNetworkModeEnabled(mode: RustNetworkMode): boolean {
  const modeEnv: boolean | undefined = parseFlag(process.env[MODE_FLAG[mode]]);
  if (modeEnv !== undefined) {
    return modeEnv;
  }
  return isRustFeatureEnabled("SIGNALER_RUST_NETWORK");
}

export async function runRustNetworkWorker<ResultT extends RustNetworkTask>(params: {
  readonly mode: RustNetworkMode;
  readonly baseUrl: string;
  readonly parallel: number;
  readonly timeoutMs: number;
  readonly retryPolicy: "off" | "auto" | "aggressive";
  readonly tasks: readonly RustNetworkTask[];
  readonly options?: Record<string, unknown>;
  readonly sidecarTimeoutMs?: number;
}): Promise<RustNetworkAttempt<ResultT>> {
  const requested: boolean = isRustNetworkModeEnabled(params.mode);
  if (!requested) {
    return { enabled: false, requested: false, used: false };
  }

  const tempDir: string = await mkdtemp(join(tmpdir(), `signaler-rust-network-${params.mode}-`));
  const inPath: string = resolve(tempDir, "in.json");
  const outPath: string = resolve(tempDir, "out.json");
  const payload: RustNetworkInput = {
    schemaVersion: 1,
    mode: params.mode,
    baseUrl: params.baseUrl,
    parallel: Math.max(1, Math.floor(params.parallel)),
    timeoutMs: Math.max(1, Math.floor(params.timeoutMs)),
    retryPolicy: params.retryPolicy,
    tasks: params.tasks,
    options: params.options ?? {},
  };

  try {
    await writeFile(inPath, JSON.stringify(payload, null, 2), "utf8");
    const run = await runRustSidecar({
      args: ["net-worker", "--mode", params.mode, "--in", inPath, "--out", outPath],
      timeoutMs: params.sidecarTimeoutMs ?? 90_000,
    });
    if (!run.ok) {
      return {
        enabled: true,
        requested: true,
        used: false,
        sidecarElapsedMs: run.elapsedMs,
        fallbackReason: normalizeFallbackReason(run.errorMessage ?? "Rust network worker failed."),
      };
    }
    const rawText: string = await readFile(outPath, "utf8");
    const parsedRaw: unknown = JSON.parse(rawText) as unknown;
    const parsed: RustNetworkOutput | undefined = validateRustNetworkOutput(parsedRaw, params.mode);
    if (!parsed) {
      return {
        enabled: true,
        requested: true,
        used: false,
        sidecarElapsedMs: run.elapsedMs,
        fallbackReason: "Rust network worker produced an invalid output payload.",
      };
    }
    return {
      enabled: true,
      requested: true,
      used: true,
      sidecarElapsedMs: run.elapsedMs,
      output: {
        status: parsed.status,
        elapsedMs: parsed.elapsedMs,
        usedFallbackSafeDefaults: parsed.usedFallbackSafeDefaults,
        stats: parsed.stats,
        results: parsed.results as readonly ResultT[],
      },
    };
  } catch (error) {
    return {
      enabled: true,
      requested: true,
      used: false,
      fallbackReason: normalizeFallbackReason(error instanceof Error ? error.message : "Rust network worker crashed."),
    };
  } finally {
    await rm(tempDir, { recursive: true, force: true });
  }
}
