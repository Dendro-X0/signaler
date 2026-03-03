import type { ApexThrottlingMethod, RunMeta } from "../../core/types.js";

export type RunnerModeV3 = "fidelity" | "throughput";

export type RunnerProfileV3 = "fidelity-devtools-stable" | "throughput-balanced";

export interface RunProtocolV3 {
  readonly contractVersion: "v3";
  readonly workflow: "init-run-review";
  readonly mode: RunnerModeV3;
  readonly profile: RunnerProfileV3;
  readonly throttlingMethod: ApexThrottlingMethod;
  readonly parallel: number;
  readonly warmUp: boolean;
  readonly headless: boolean;
  readonly runsPerCombo: number;
  readonly captureLevel: "diagnostics" | "lhr" | "none";
  readonly comparabilityHash: string;
  readonly disclaimer: string;
}

export interface RunV3 {
  readonly schemaVersion: 1;
  readonly engineVersion: string;
  readonly startedAt: string;
  readonly completedAt: string;
  readonly outputDir: string;
  readonly mode: "audit" | "measure" | "report" | "folder";
  readonly artifacts: readonly { readonly kind: "file" | "dir"; readonly relativePath: string }[];
  readonly protocol: RunProtocolV3;
  readonly meta: RunMeta;
}
