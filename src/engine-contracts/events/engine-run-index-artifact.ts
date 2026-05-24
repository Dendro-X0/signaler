/**
  * Artifact entry for an engine run index.
  */
export type EngineRunIndexArtifact = {
  readonly kind: "file" | "dir";
  readonly relativePath: string;
};
