export type EngineJobStepV1 = {
  readonly command: string;
  readonly args?: readonly string[];
};

export type EngineJobV1 = {
  readonly schemaVersion: 1;
  readonly jobId: string;
  readonly createdAt: string;
  readonly cwd: string;
  readonly outputDir: string;
  readonly preset?: "agent" | "ci" | "pr" | "custom";
  /** Named policy profile (v4.3): ci-strict, pr-quick, release-full */
  readonly runProfile?: string;
  readonly steps: readonly EngineJobStepV1[];
};

export type EngineJobResultStepV1 = {
  readonly command: string;
  readonly exitCode: number;
  readonly elapsedMs: number;
};

export type EngineJobResultV1 = {
  readonly schemaVersion: 1;
  readonly jobId: string;
  readonly status: "success" | "failed";
  readonly startedAt: string;
  readonly completedAt: string;
  readonly elapsedMs: number;
  readonly steps: readonly EngineJobResultStepV1[];
  readonly primaryArtifacts: readonly string[];
};

export function isEngineJobV1(value: unknown): value is EngineJobV1 {
  if (typeof value !== "object" || value === null) {
    return false;
  }
  const record = value as Record<string, unknown>;
  return record.schemaVersion === 1 && typeof record.jobId === "string" && Array.isArray(record.steps);
}

export function isEngineJobResultV1(value: unknown): value is EngineJobResultV1 {
  if (typeof value !== "object" || value === null) {
    return false;
  }
  const record = value as Record<string, unknown>;
  return record.schemaVersion === 1 && (record.status === "success" || record.status === "failed");
}
