import type { EngineRunIndexArtifact } from "./engine-run-index-artifact.js";

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
  readonly protocol?: {
    readonly mode: "fidelity" | "throughput";
    readonly profile: "fidelity-devtools-stable" | "throughput-balanced";
    readonly throttlingMethod: "simulate" | "devtools";
    readonly parallel: number;
    readonly warmUp: boolean;
    readonly headless: boolean;
    readonly runsPerCombo: number;
    readonly captureLevel: "diagnostics" | "lhr" | "none";
    readonly comparabilityHash: string;
    readonly disclaimer: string;
  };
};
