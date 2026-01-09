import type { EngineEventPayload } from "./engine-events-schema.js";
import type { EngineExportBundle } from "./engine-export-bundle-schema.js";
import type { EngineManifestSchema } from "./engine-manifest-schema.js";
import type { EngineRunIndex } from "./engine-run-index.js";
import type { EngineRunIndexArtifact } from "./engine-run-index-artifact.js";

type EngineContract = {
  readonly manifest: EngineManifestSchema;
  readonly event: EngineEventPayload;
  readonly runIndex: EngineRunIndex;
  readonly runIndexArtifact: EngineRunIndexArtifact;
  readonly exportBundle: EngineExportBundle;
};

export type { EngineContract };
