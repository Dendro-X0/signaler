import type { ApexDevice, MetricValues, RunMeta, RunSummary } from "./core/types.js";

type EngineExportBundleMeta = Omit<RunMeta, "configPath"> & {
  readonly configFileName: string;
};

type EngineExportBundleResult = {
  readonly label: string;
  readonly path: string;
  readonly device: ApexDevice;
  readonly url: string;
  readonly scores: RunSummary["results"][number]["scores"];
  readonly metrics: MetricValues;
  readonly runtimeErrorMessage?: string;
};

type EngineExportBundle = {
  readonly schemaVersion: 1;
  readonly generatedAt: string;
  readonly meta: EngineExportBundleMeta;
  readonly results: readonly EngineExportBundleResult[];
};

export type { EngineExportBundle };
