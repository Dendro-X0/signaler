import { spawnSync } from "node:child_process";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import type { EngineJobStepV1 } from "../../engine-contracts/jobs/index.js";
import type { EngineJobStepOutcome, EngineJobStepRunner } from "./types.js";

function defaultBinPath(): string {
  const here = dirname(fileURLToPath(import.meta.url));
  return resolve(here, "../../bin.js");
}

/**
 * Subprocess step runner used by the CLI shell: `node dist/bin.js <command> ...args`.
 */
export function createDefaultEngineJobStepRunner(params?: {
  readonly binPath?: string;
}): EngineJobStepRunner {
  const binPath = params?.binPath ?? defaultBinPath();
  return ({ cwd, step }) => runBinStep({ cwd, step, binPath });
}

export function runBinStep(params: {
  readonly cwd: string;
  readonly step: EngineJobStepV1;
  readonly binPath: string;
}): EngineJobStepOutcome {
  const startedAt = Date.now();
  const argv = [params.step.command, ...(params.step.args ?? [])];
  const result = spawnSync(process.execPath, [params.binPath, ...argv], {
    cwd: params.cwd,
    stdio: "inherit",
    env: process.env,
  });
  return {
    exitCode: result.status ?? 1,
    elapsedMs: Date.now() - startedAt,
  };
}
