export type ArtifactLayoutMode = "flat" | "tree";

export type ArtifactAudience = "agent" | "developer" | "ci" | "diagnostics" | "legacy" | "export";

export type ArtifactRunner =
  | "lighthouse"
  | "analyze"
  | "verify"
  | "headers"
  | "links"
  | "bundle"
  | "measure"
  | "console"
  | "accessibility"
  | "orchestration"
  | "gate";

export type ArtifactWeight = "entrypoint" | "summary" | "bulk" | "diagnostics";

export type ArtifactRule = {
  readonly id: string;
  readonly flatPath: string;
  readonly treePath: string;
  readonly audience: ArtifactAudience;
  readonly runner: ArtifactRunner;
  readonly weight: ArtifactWeight;
  readonly contract?: string;
  readonly agentReadOrder?: number;
  readonly developerEntrypoint?: boolean;
};

export type ManifestArtifactEntry = {
  readonly id: string;
  readonly path: string;
  readonly legacyPath?: string;
  readonly audience: ArtifactAudience;
  readonly runner: ArtifactRunner;
  readonly weight: ArtifactWeight;
  readonly contract?: string;
};

export type ArtifactManifestV1 = {
  readonly schemaVersion: 1;
  readonly layoutVersion: 1;
  readonly layout: ArtifactLayoutMode;
  readonly generatedAt: string;
  readonly entrypoints: {
    readonly agent: readonly string[];
    readonly developer: readonly string[];
    readonly ci: readonly string[];
  };
  readonly artifacts: readonly ManifestArtifactEntry[];
};

export type AgentEntrypointsV1 = {
  readonly schemaVersion: 1;
  readonly generatedAt: string;
  readonly readOrder: readonly {
    readonly id: string;
    readonly path: string;
    readonly note?: string;
  }[];
  readonly preferCli: readonly string[];
};
