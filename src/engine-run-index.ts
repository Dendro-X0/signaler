import type { EngineRunIndexArtifact } from "./engine-run-index-artifact.js";
import type { RunMeta } from "./core/types.js";

/**
 * Index file describing an engine run and its output artifacts.
 */
export type EngineRunIndex = {
  readonly schemaVersion: 1;
  readonly engineVersion: string;
  readonly startedAt: string;
  readonly completedAt: string;
  readonly outputDir: string;
  readonly mode: "audit" | "measure" | "report" | "folder";
  readonly artifacts: readonly EngineRunIndexArtifact[];
  readonly contractVersion?: "legacy" | "v3";
  readonly workflow?: "init-run-review";
  readonly meta?: RunMeta;
  readonly protocol?: {
    readonly mode: "fidelity" | "throughput";
    readonly profile: "fidelity-devtools-stable" | "throughput-balanced";
    readonly throttlingMethod: "simulate" | "devtools";
    readonly parallel: number;
    readonly sessionIsolation?: "shared" | "per-audit";
    readonly throughputBackoff?: "auto" | "aggressive" | "off";
    readonly warmUp: boolean;
    readonly headless: boolean;
    readonly runsPerCombo: number;
    readonly captureLevel: "diagnostics" | "lhr" | "none";
    readonly comparabilityHash: string;
    readonly disclaimer: string;
  };
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
      readonly rustBenchmark?: { readonly enabled: boolean; readonly used: boolean; readonly fallbackReason?: string; readonly sidecarElapsedMs?: number };
    };
  };
};
