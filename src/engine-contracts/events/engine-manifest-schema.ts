type EngineManifestSchema = {
  readonly schemaVersion: 1;
  readonly engineVersion: string;
  readonly minNode: string;
  readonly entry: string;
  readonly defaultOutputDirName: string;
};

export type { EngineManifestSchema };
