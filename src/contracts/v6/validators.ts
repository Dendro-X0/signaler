import type { AnalyzeReportV6 } from "./analyze-v6.js";
import type { VerifyReportV6, VerifyThresholdsV6 } from "./verify-v6.js";

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.length > 0;
}

function isExternalSignalsMetadata(value: unknown): boolean {
  if (!isRecord(value)) return false;
  if (typeof value.enabled !== "boolean") return false;
  if (!Array.isArray(value.inputFiles)) return false;
  for (const file of value.inputFiles) {
    if (!isNonEmptyString(file)) return false;
  }
  if (typeof value.accepted !== "number" || value.accepted < 0) return false;
  if (typeof value.rejected !== "number" || value.rejected < 0) return false;
  if (value.digest !== null && !isNonEmptyString(value.digest)) return false;
  if (value.enabled) {
    if (!isNonEmptyString(value.digest)) return false;
  } else {
    if (value.digest !== null) return false;
    if (value.inputFiles.length !== 0) return false;
    if (value.accepted !== 0 || value.rejected !== 0) return false;
  }
  if (value.policy !== "v1-conservative-high-30d-route-issue") return false;
  return true;
}

export function isAnalyzeReportV6(value: unknown): value is AnalyzeReportV6 {
  if (!isRecord(value)) return false;
  if (value.schemaVersion !== 1) return false;
  if (!isNonEmptyString(value.generatedAt)) return false;
  if (!isRecord(value.source)) return false;
  if (!isNonEmptyString(value.source.dir)) return false;
  if (!isNonEmptyString(value.source.runComparabilityHash)) return false;
  if (value.source.runMode !== "fidelity" && value.source.runMode !== "throughput") return false;
  if (!isNonEmptyString(value.source.runProfile)) return false;
  if (value.artifactProfile !== "lean" && value.artifactProfile !== "standard" && value.artifactProfile !== "diagnostics") return false;
  if (typeof value.tokenBudget !== "number") return false;
  if (!isRecord(value.rankingPolicy)) return false;
  if (value.rankingPolicy.version !== "v6.1" && value.rankingPolicy.version !== "v6.2") return false;
  if (
    value.rankingPolicy.formula !== "priority = round(basePriority * confidenceWeight * coverageWeight)"
    && value.rankingPolicy.formula !== "priority = round(basePriority * confidenceWeight * coverageWeight * (1 + externalBoostWeight))"
  ) return false;
  if (!Array.isArray(value.actions)) return false;
  for (const action of value.actions) {
    if (!isRecord(action)) return false;
    if (!isNonEmptyString(action.id) || !isNonEmptyString(action.title)) return false;
    if (action.category !== "performance" && action.category !== "accessibility" && action.category !== "best-practices" && action.category !== "seo" && action.category !== "reliability") {
      return false;
    }
    if (typeof action.priorityScore !== "number") return false;
    if (action.confidence !== "high" && action.confidence !== "medium" && action.confidence !== "low") return false;
    if (!isRecord(action.estimatedImpact)) return false;
    if (typeof action.estimatedImpact.affectedCombos !== "number") return false;
    if (!Array.isArray(action.affectedCombos)) return false;
    if (!Array.isArray(action.evidence) || action.evidence.length === 0) return false;
    for (const evidence of action.evidence) {
      if (!isRecord(evidence)) return false;
      if (!isNonEmptyString(evidence.sourceRelPath) || !isNonEmptyString(evidence.pointer)) return false;
    }
    if (!isRecord(action.action)) return false;
    if (!isNonEmptyString(action.action.summary)) return false;
    if (!Array.isArray(action.action.steps)) return false;
    if (action.action.effort !== "low" && action.action.effort !== "medium" && action.action.effort !== "high") return false;
    if (!isRecord(action.verifyPlan)) return false;
    if (action.verifyPlan.recommendedMode !== "fidelity" && action.verifyPlan.recommendedMode !== "throughput") return false;
    if (!Array.isArray(action.verifyPlan.targetRoutes)) return false;
    if (!isRecord(action.verifyPlan.expectedDirection)) return false;
  }
  if (value.externalSignals !== undefined && !isExternalSignalsMetadata(value.externalSignals)) return false;
  if (!isRecord(value.summary)) return false;
  if (typeof value.summary.totalCandidates !== "number") return false;
  if (typeof value.summary.emittedActions !== "number") return false;
  if (typeof value.summary.droppedZeroImpact !== "number") return false;
  if (typeof value.summary.droppedLowConfidence !== "number") return false;
  if (typeof value.summary.droppedMissingEvidence !== "number") return false;
  if (typeof value.summary.droppedDuplicate !== "number") return false;
  if (typeof value.summary.droppedByProfileCap !== "number") return false;
  if (typeof value.summary.droppedByTopActions !== "number") return false;
  if (typeof value.summary.droppedByTokenBudget !== "number") return false;
  if (typeof value.summary.estimatedTokens !== "number") return false;
  if (!Array.isArray(value.summary.warnings)) return false;
  for (const warning of value.summary.warnings) {
    if (!isNonEmptyString(warning)) return false;
  }
  return true;
}

function isNonNegativeNumberOrUndefined(value: unknown): boolean {
  return value === undefined || (typeof value === "number" && value >= 0);
}

export function isVerifyThresholdsV6(value: unknown): value is VerifyThresholdsV6 {
  if (!isRecord(value)) return false;
  if (!isNonNegativeNumberOrUndefined(value.minScoreDelta)) return false;
  if (!isNonNegativeNumberOrUndefined(value.minLcpDeltaMs)) return false;
  if (!isNonNegativeNumberOrUndefined(value.minTbtDeltaMs)) return false;
  if (!isNonNegativeNumberOrUndefined(value.minClsDelta)) return false;
  if (!isNonNegativeNumberOrUndefined(value.minBytesDelta)) return false;
  return true;
}

function isMetricBlock(value: unknown): boolean {
  if (!isRecord(value)) return false;
  if (value.score !== undefined && typeof value.score !== "number") return false;
  if (value.lcpMs !== undefined && typeof value.lcpMs !== "number") return false;
  if (value.tbtMs !== undefined && typeof value.tbtMs !== "number") return false;
  if (value.cls !== undefined && typeof value.cls !== "number") return false;
  if (value.bytes !== undefined && typeof value.bytes !== "number") return false;
  return true;
}

export function isVerifyReportV6(value: unknown): value is VerifyReportV6 {
  if (!isRecord(value)) return false;
  if (value.schemaVersion !== 1) return false;
  if (!isNonEmptyString(value.verifyRunId)) return false;
  if (!isNonEmptyString(value.generatedAt)) return false;
  if (!isRecord(value.baseline)) return false;
  if (!isNonEmptyString(value.baseline.dir)) return false;
  if (!isNonEmptyString(value.baseline.comparabilityHash)) return false;
  if (value.baseline.mode !== "fidelity" && value.baseline.mode !== "throughput") return false;
  if (!isRecord(value.rerun)) return false;
  if (!isNonEmptyString(value.rerun.dir)) return false;
  if (!isNonEmptyString(value.rerun.comparabilityHash)) return false;
  if (value.rerun.mode !== "fidelity" && value.rerun.mode !== "throughput") return false;
  if (typeof value.rerun.elapsedMs !== "number") return false;
  if (!isRecord(value.comparability)) return false;
  if (typeof value.comparability.strict !== "boolean") return false;
  if (typeof value.comparability.matched !== "boolean") return false;
  if (value.comparability.reason !== undefined && !isNonEmptyString(value.comparability.reason)) return false;
  if (!Array.isArray(value.checks)) return false;
  for (const check of value.checks) {
    if (!isRecord(check)) return false;
    if (!isNonEmptyString(check.actionId) || !isNonEmptyString(check.actionTitle)) return false;
    if (check.status !== "pass" && check.status !== "fail" && check.status !== "skipped") return false;
    if (check.reason !== undefined && !isNonEmptyString(check.reason)) return false;
    if (!isMetricBlock(check.before) || !isMetricBlock(check.after) || !isMetricBlock(check.delta)) return false;
    if (!isRecord(check.threshold)) return false;
    if (!Array.isArray(check.evidence)) return false;
    for (const evidence of check.evidence) {
      if (!isRecord(evidence)) return false;
      if (!isNonEmptyString(evidence.sourceRelPath) || !isNonEmptyString(evidence.pointer)) return false;
      if (evidence.artifactRelPath !== undefined && !isNonEmptyString(evidence.artifactRelPath)) return false;
    }
  }
  if (!isRecord(value.summary)) return false;
  if (typeof value.summary.totalChecks !== "number") return false;
  if (typeof value.summary.passed !== "number") return false;
  if (typeof value.summary.failed !== "number") return false;
  if (typeof value.summary.skipped !== "number") return false;
  if (value.summary.status !== "pass" && value.summary.status !== "fail") return false;
  if (!Array.isArray(value.summary.warnings)) return false;
  for (const warning of value.summary.warnings) {
    if (!isNonEmptyString(warning)) return false;
  }
  return true;
}
