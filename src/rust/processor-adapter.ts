import { mkdtemp, readFile, rm } from "node:fs/promises";
import { join, resolve } from "node:path";
import { tmpdir } from "node:os";
import { isRustFeatureEnabled, runRustSidecar } from "./bridge.js";

type RustTopIssue = {
  readonly id: string;
  readonly title: string;
  readonly count: number;
  readonly totalMs: number;
};

type RustProcessorOutput = {
  readonly status: "ok" | "error";
  readonly topIssues?: readonly RustTopIssue[];
  readonly message?: string;
};

export type RustProcessorAttempt = {
  readonly enabled: boolean;
  readonly used: boolean;
  readonly topIssues?: readonly RustTopIssue[];
  readonly fallbackReason?: string;
};

export async function processSummaryWithRust(params: {
  readonly summaryPath: string;
}): Promise<RustProcessorAttempt> {
  if (!isRustFeatureEnabled("SIGNALER_RUST_PROCESSOR")) {
    return { enabled: false, used: false };
  }
  const tempDir: string = await mkdtemp(join(tmpdir(), "signaler-rust-processor-"));
  const outPath: string = resolve(tempDir, "processed-summary.json");
  try {
    const result = await runRustSidecar({
      args: [
        "process-summary",
        "--summary",
        params.summaryPath,
        "--out",
        outPath,
      ],
      timeoutMs: 45_000,
    });
    if (!result.ok) {
      return {
        enabled: true,
        used: false,
        fallbackReason: result.errorMessage ?? "Rust summary processor failed.",
      };
    }
    const raw: string = await readFile(outPath, "utf8");
    const parsed = JSON.parse(raw) as RustProcessorOutput;
    if (parsed.status !== "ok" || !Array.isArray(parsed.topIssues)) {
      return {
        enabled: true,
        used: false,
        fallbackReason: parsed.message ?? "Rust summary processor output was invalid.",
      };
    }
    return {
      enabled: true,
      used: true,
      topIssues: parsed.topIssues,
    };
  } catch (error) {
    return {
      enabled: true,
      used: false,
      fallbackReason: error instanceof Error ? error.message : "Rust summary processor crashed.",
    };
  } finally {
    await rm(tempDir, { recursive: true, force: true });
  }
}
