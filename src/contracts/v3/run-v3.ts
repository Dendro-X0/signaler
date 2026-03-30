import type { ApexThrottlingMethod, ApexThroughputBackoffPolicy, RunMeta } from "../../core/types.js";

export type RunnerModeV3 = "fidelity" | "throughput";

export type RunnerProfileV3 = "fidelity-devtools-stable" | "throughput-balanced";

export interface RunProtocolV3 {
  readonly contractVersion: "v3";
  readonly workflow: "init-run-review";
  readonly mode: RunnerModeV3;
  readonly profile: RunnerProfileV3;
  readonly throttlingMethod: ApexThrottlingMethod;
  readonly parallel: number;
  readonly sessionIsolation: "shared" | "per-audit";
  readonly throughputBackoff: ApexThroughputBackoffPolicy;
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
  readonly runtime?: {
    readonly resourceProfile?: {
      readonly cpuCount: number;
      readonly freeMemoryMB: number;
      readonly baseParallelCap: number;
      readonly appliedParallelCap: number;
      readonly reasons: readonly string[];
    };
    readonly stepTimings?: {
      readonly warmUpMs: number;
      readonly queueBuildMs: number;
      readonly runLoopMs: number;
      readonly reductionMs: number;
      readonly artifactWriteMs: number;
      readonly totalPipelineMs: number;
    };
    readonly accelerators?: {
      readonly rustCore?: { readonly enabled: boolean; readonly used: boolean; readonly fallbackReason?: string; readonly sidecarElapsedMs?: number };
      readonly rustDiscovery?: { readonly enabled: boolean; readonly used: boolean; readonly fallbackReason?: string };
      readonly rustProcessor?: { readonly enabled: boolean; readonly used: boolean; readonly fallbackReason?: string };
    };
  };
}
