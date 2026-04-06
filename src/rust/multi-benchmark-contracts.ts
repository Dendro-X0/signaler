import type { MultiBenchmarkSourceIdV1 } from "../contracts/multi-benchmark-v1.js";

export type RustBenchmarkNormalizeInput = {
  readonly schemaVersion: 1;
  readonly inputFiles: readonly string[];
};

export type RustBenchmarkNormalizeRecord = {
  readonly sourceId: MultiBenchmarkSourceIdV1;
  readonly collectedAt: string;
  readonly collectedAtMs: number;
  readonly id: string;
  readonly target: {
    readonly issueId: string;
    readonly path: string;
    readonly device?: "mobile" | "desktop";
  };
  readonly confidence: "high" | "medium" | "low";
  readonly evidence: readonly {
    readonly sourceRelPath: string;
    readonly pointer: string;
    readonly artifactRelPath?: string;
  }[];
  readonly metrics?: Record<string, number>;
};

export type RustBenchmarkNormalizeOutput = {
  readonly schemaVersion: 1;
  readonly status: "ok" | "warn" | "error";
  readonly inputFiles: readonly string[];
  readonly sourceIds: readonly MultiBenchmarkSourceIdV1[];
  readonly records: readonly RustBenchmarkNormalizeRecord[];
  readonly stats: {
    readonly elapsedMs: number;
    readonly recordsCount: number;
    readonly inputRecordsCount?: number;
    readonly dedupedRecordsCount?: number;
    readonly recordsDigest?: string;
  };
  readonly errorMessage?: string;
};

export type RustBenchmarkScoreInput = {
  readonly schemaVersion: 1;
  readonly acceptedRecords: readonly RustBenchmarkNormalizeRecord[];
  readonly candidates: readonly {
    readonly candidateId: string;
    readonly issueId: string;
    readonly allowedPaths?: readonly string[];
  }[];
};

export type RustBenchmarkScoreResult = {
  readonly candidateId: string;
  readonly totalBoost: number;
  readonly sourceBoosts: {
    readonly "accessibility-extended": number;
    readonly "security-baseline": number;
    readonly "seo-technical": number;
    readonly "reliability-slo": number;
    readonly "cross-browser-parity": number;
  };
  readonly evidence: readonly {
    readonly sourceRelPath: string;
    readonly pointer: string;
    readonly artifactRelPath?: string;
  }[];
};

export type RustBenchmarkScoreOutput = {
  readonly schemaVersion: 1;
  readonly status: "ok" | "warn" | "error";
  readonly results: readonly RustBenchmarkScoreResult[];
  readonly stats: {
    readonly elapsedMs: number;
    readonly candidatesCount: number;
    readonly acceptedRecordsCount: number;
    readonly matchedRecordsCount: number;
  };
  readonly errorMessage?: string;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function isFiniteNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.length > 0;
}

function isSourceId(value: unknown): value is MultiBenchmarkSourceIdV1 {
  return value === "accessibility-extended"
    || value === "security-baseline"
    || value === "seo-technical"
    || value === "reliability-slo"
    || value === "cross-browser-parity";
}

function isEvidence(value: unknown): boolean {
  if (!Array.isArray(value)) return false;
  for (const row of value) {
    if (!isRecord(row)) return false;
    if (!isNonEmptyString(row.sourceRelPath) || !isNonEmptyString(row.pointer)) return false;
    if (row.artifactRelPath !== undefined && !isNonEmptyString(row.artifactRelPath)) return false;
  }
  return true;
}

function isStringArray(value: unknown): value is readonly string[] {
  return Array.isArray(value) && value.every((row) => isNonEmptyString(row));
}

function isSourceBoosts(value: unknown): boolean {
  if (!isRecord(value)) return false;
  const keys = [
    "accessibility-extended",
    "security-baseline",
    "seo-technical",
    "reliability-slo",
    "cross-browser-parity",
  ] as const;
  for (const key of keys) {
    if (!isFiniteNumber(value[key])) return false;
  }
  return true;
}

function isScoreResult(value: unknown): value is RustBenchmarkScoreResult {
  if (!isRecord(value)) return false;
  if (!isNonEmptyString(value.candidateId)) return false;
  if (!isFiniteNumber(value.totalBoost)) return false;
  if (!isSourceBoosts(value.sourceBoosts)) return false;
  if (!isEvidence(value.evidence)) return false;
  return true;
}

function isMetrics(value: unknown): boolean {
  if (value === undefined) return true;
  if (!isRecord(value)) return false;
  for (const key of Object.keys(value)) {
    if (!isFiniteNumber(value[key])) return false;
  }
  return true;
}

function isNormalizeRecord(value: unknown): value is RustBenchmarkNormalizeRecord {
  if (!isRecord(value)) return false;
  if (!isSourceId(value.sourceId)) return false;
  if (!isNonEmptyString(value.collectedAt)) return false;
  if (!isFiniteNumber(value.collectedAtMs)) return false;
  if (!isNonEmptyString(value.id)) return false;
  if (!isRecord(value.target)) return false;
  if (!isNonEmptyString(value.target.issueId) || !isNonEmptyString(value.target.path)) return false;
  if (value.target.device !== undefined && value.target.device !== "mobile" && value.target.device !== "desktop") return false;
  if (value.confidence !== "high" && value.confidence !== "medium" && value.confidence !== "low") return false;
  if (!isEvidence(value.evidence)) return false;
  if (!isMetrics(value.metrics)) return false;
  return true;
}

export function validateRustBenchmarkNormalizeOutput(raw: unknown): RustBenchmarkNormalizeOutput | undefined {
  if (!isRecord(raw)) return undefined;
  if (raw.schemaVersion !== 1) return undefined;
  if (raw.status !== "ok" && raw.status !== "warn" && raw.status !== "error") return undefined;
  if (!Array.isArray(raw.inputFiles) || !raw.inputFiles.every((file) => isNonEmptyString(file))) return undefined;
  if (!Array.isArray(raw.sourceIds) || !raw.sourceIds.every((source) => isSourceId(source))) return undefined;
  if (!Array.isArray(raw.records) || !raw.records.every((row) => isNormalizeRecord(row))) return undefined;
  if (!isRecord(raw.stats)) return undefined;
  if (!isFiniteNumber(raw.stats.elapsedMs) || !isFiniteNumber(raw.stats.recordsCount)) return undefined;
  if (raw.stats.inputRecordsCount !== undefined && !isFiniteNumber(raw.stats.inputRecordsCount)) return undefined;
  if (raw.stats.dedupedRecordsCount !== undefined && !isFiniteNumber(raw.stats.dedupedRecordsCount)) return undefined;
  if (raw.stats.recordsDigest !== undefined && !isNonEmptyString(raw.stats.recordsDigest)) return undefined;
  if (raw.errorMessage !== undefined && raw.errorMessage !== null && !isNonEmptyString(raw.errorMessage)) return undefined;
  return raw as RustBenchmarkNormalizeOutput;
}

export function validateRustBenchmarkScoreOutput(raw: unknown): RustBenchmarkScoreOutput | undefined {
  if (!isRecord(raw)) return undefined;
  if (raw.schemaVersion !== 1) return undefined;
  if (raw.status !== "ok" && raw.status !== "warn" && raw.status !== "error") return undefined;
  if (!Array.isArray(raw.results) || !raw.results.every((row) => isScoreResult(row))) return undefined;
  if (!isRecord(raw.stats)) return undefined;
  if (!isFiniteNumber(raw.stats.elapsedMs)) return undefined;
  if (!isFiniteNumber(raw.stats.candidatesCount)) return undefined;
  if (!isFiniteNumber(raw.stats.acceptedRecordsCount)) return undefined;
  if (!isFiniteNumber(raw.stats.matchedRecordsCount)) return undefined;
  if (raw.errorMessage !== undefined && raw.errorMessage !== null && !isNonEmptyString(raw.errorMessage)) return undefined;
  return raw as RustBenchmarkScoreOutput;
}

export function validateRustBenchmarkScoreInput(raw: unknown): RustBenchmarkScoreInput | undefined {
  if (!isRecord(raw)) return undefined;
  if (raw.schemaVersion !== 1) return undefined;
  if (!Array.isArray(raw.acceptedRecords) || !raw.acceptedRecords.every((row) => isNormalizeRecord(row))) return undefined;
  if (!Array.isArray(raw.candidates)) return undefined;
  for (const candidate of raw.candidates) {
    if (!isRecord(candidate)) return undefined;
    if (!isNonEmptyString(candidate.candidateId) || !isNonEmptyString(candidate.issueId)) return undefined;
    if (candidate.allowedPaths !== undefined && !isStringArray(candidate.allowedPaths)) return undefined;
  }
  return raw as RustBenchmarkScoreInput;
}
