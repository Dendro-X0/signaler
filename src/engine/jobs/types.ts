import type { EngineJobResultV1, EngineJobStepV1, EngineJobV1 } from "../../engine-contracts/jobs/index.js";

export type EngineJobPreset = "agent" | "ci" | "pr";

export type EngineJobStepOutcome = {
  readonly exitCode: number;
  readonly elapsedMs: number;
};

/**
 * Runs a single job step. Shell adapters may delegate to subprocesses; tests may stub this.
 */
export type EngineJobStepRunner = (params: {
  readonly cwd: string;
  readonly step: EngineJobStepV1;
}) => EngineJobStepOutcome | Promise<EngineJobStepOutcome>;

export type EngineJobRunOptions = {
  readonly job: EngineJobV1;
  readonly stepRunner?: EngineJobStepRunner;
  /** When true (default), persist job.json / job-result.json under the output dir. */
  readonly writeArtifacts?: boolean;
};

/** 0 = all steps ok; 1 = discover/run failure; 2 = run ok, analyze failed (triage may still be usable). */
export type EngineJobExitCode = 0 | 1 | 2;

export type EngineJobRunOutcome = {
  readonly job: EngineJobV1;
  readonly result: EngineJobResultV1;
  readonly exitCode: EngineJobExitCode;
};
