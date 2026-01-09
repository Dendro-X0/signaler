import type { EngineRunIndexArtifact } from "./engine-run-index-artifact.js";

export type EngineRunIndex = {
  readonly schemaVersion: 1;
  readonly engineVersion: string;
  readonly startedAt: string;
  readonly completedAt: string;
  readonly outputDir: string;
  readonly mode: "audit" | "measure" | "report" | "folder";
  readonly artifacts: readonly EngineRunIndexArtifact[];
};
