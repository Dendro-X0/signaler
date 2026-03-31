import type { ApexDevice } from "../core/types.js";

export type MultiBenchmarkSourceIdV1 =
  | "accessibility-extended"
  | "security-baseline"
  | "seo-technical"
  | "reliability-slo"
  | "cross-browser-parity";

export type MultiBenchmarkConfidenceV1 = "high" | "medium" | "low";

export interface MultiBenchmarkEvidenceV1 {
  readonly sourceRelPath: string;
  readonly pointer: string;
  readonly artifactRelPath?: string;
}

export interface AccessibilityExtendedMetricsV1 {
  readonly wcagViolationCount?: number;
  readonly seriousViolationCount?: number;
  readonly criticalViolationCount?: number;
  readonly ariaPatternMismatchCount?: number;
  readonly focusAppearanceIssueCount?: number;
  readonly focusNotObscuredIssueCount?: number;
  readonly targetSizeIssueCount?: number;
  readonly draggingAlternativeIssueCount?: number;
  readonly apgPatternMismatchCount?: number;
  readonly keyboardSupportIssueCount?: number;
}

export interface SecurityBaselineMetricsV1 {
  readonly missingHeaderCount?: number;
  readonly tlsConfigIssueCount?: number;
  readonly cookiePolicyIssueCount?: number;
  readonly mixedContentCount?: number;
}

export interface SeoTechnicalMetricsV1 {
  readonly indexabilityIssueCount?: number;
  readonly canonicalMismatchCount?: number;
  readonly structuredDataErrorCount?: number;
  readonly crawlabilityIssueCount?: number;
}

export interface ReliabilitySloMetricsV1 {
  readonly availabilityPct?: number;
  readonly errorRatePct?: number;
  readonly latencyP95Ms?: number;
}

export interface CrossBrowserParityMetricsV1 {
  readonly scoreVariancePct?: number;
  readonly lcpDeltaMs?: number;
  readonly clsDelta?: number;
}

export type MultiBenchmarkMetricsV1 =
  | AccessibilityExtendedMetricsV1
  | SecurityBaselineMetricsV1
  | SeoTechnicalMetricsV1
  | ReliabilitySloMetricsV1
  | CrossBrowserParityMetricsV1;

export interface MultiBenchmarkRecordV1 {
  readonly id: string;
  readonly target: {
    readonly issueId: string;
    readonly path: string;
    readonly device?: ApexDevice;
  };
  readonly confidence: MultiBenchmarkConfidenceV1;
  readonly evidence: readonly MultiBenchmarkEvidenceV1[];
  readonly metrics?: MultiBenchmarkMetricsV1;
}

export interface MultiBenchmarkSourceV1 {
  readonly sourceId: MultiBenchmarkSourceIdV1;
  readonly collectedAt: string;
  readonly records: readonly MultiBenchmarkRecordV1[];
}

export interface MultiBenchmarkSignalsFileV1 {
  readonly schemaVersion: 1;
  readonly sources: readonly MultiBenchmarkSourceV1[];
}

export interface MultiBenchmarkMetadataV1 {
  readonly enabled: boolean;
  readonly inputFiles: readonly string[];
  readonly sources: readonly MultiBenchmarkSourceIdV1[];
  readonly accepted: number;
  readonly rejected: number;
  readonly digest: string | null;
  readonly policy: "v1-conservative-high-30d-route-issue";
  readonly rankingVersion: "j1-metadata-only" | "j2-metadata-only" | "j3-composite-ranking";
}
