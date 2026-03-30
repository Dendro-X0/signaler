import type { ApexDevice } from "../core/types.js";

export type ExternalSignalAdapterIdV1 = "psi" | "crux" | "rum" | "wpt" | "custom";

export type ExternalSignalConfidenceV1 = "high" | "medium" | "low";

export interface ExternalSignalEvidenceV1 {
  readonly sourceRelPath: string;
  readonly pointer: string;
  readonly artifactRelPath?: string;
}

export interface ExternalSignalMetricsV1 {
  readonly lcpMsP75?: number;
  readonly inpMsP75?: number;
  readonly clsP75?: number;
  readonly ttfbMsP75?: number;
}

export interface ExternalSignalRecordV1 {
  readonly id: string;
  readonly target: {
    readonly issueId: string;
    readonly path: string;
    readonly device?: ApexDevice;
  };
  readonly confidence: ExternalSignalConfidenceV1;
  readonly weight?: number;
  readonly evidence: readonly ExternalSignalEvidenceV1[];
  readonly metrics?: ExternalSignalMetricsV1;
}

export interface ExternalSignalAdapterV1 {
  readonly adapterId: ExternalSignalAdapterIdV1;
  readonly collectedAt: string;
  readonly records: readonly ExternalSignalRecordV1[];
}

export interface ExternalSignalsFileV1 {
  readonly schemaVersion: 1;
  readonly adapters: readonly ExternalSignalAdapterV1[];
}

export interface ExternalSignalsMetadataV1 {
  readonly enabled: boolean;
  readonly inputFiles: readonly string[];
  readonly accepted: number;
  readonly rejected: number;
  readonly digest: string | null;
  readonly policy: "v1-conservative-high-30d-route-issue";
}
