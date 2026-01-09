export type EngineRunIndexArtifact = {
  readonly kind: "file" | "dir";
  readonly relativePath: string;
};
