import type { AgentIndexV3 } from "./agent-index-v3.js";
import type { ResultsV3 } from "./results-v3.js";
import type { SuggestionsV3 } from "./suggestions-v3.js";

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

function isMultiBenchmarkMetadata(value: unknown): boolean {
  if (!isRecord(value)) return false;
  if (typeof value.enabled !== "boolean") return false;
  if (!Array.isArray(value.inputFiles)) return false;
  for (const file of value.inputFiles) {
    if (!isNonEmptyString(file)) return false;
  }
  if (!Array.isArray(value.sources)) return false;
  for (const source of value.sources) {
    if (
      source !== "accessibility-extended"
      && source !== "security-baseline"
      && source !== "seo-technical"
      && source !== "reliability-slo"
      && source !== "cross-browser-parity"
    ) {
      return false;
    }
  }
  if (typeof value.accepted !== "number" || value.accepted < 0) return false;
  if (typeof value.rejected !== "number" || value.rejected < 0) return false;
  if (value.digest !== null && !isNonEmptyString(value.digest)) return false;
  if (value.enabled) {
    if (!isNonEmptyString(value.digest)) return false;
  } else {
    if (value.digest !== null) return false;
    if (value.inputFiles.length !== 0) return false;
    if (value.sources.length !== 0) return false;
    if (value.accepted !== 0 || value.rejected !== 0) return false;
  }
  if (value.policy !== "v1-conservative-high-30d-route-issue") return false;
  if (
    value.rankingVersion !== "j1-metadata-only"
    && value.rankingVersion !== "j2-metadata-only"
    && value.rankingVersion !== "j3-composite-ranking"
  ) return false;
  return true;
}

export function isResultsV3(value: unknown): value is ResultsV3 {
  if (!isRecord(value)) return false;
  if (typeof value.generatedAt !== "string") return false;
  if (!Array.isArray(value.results)) return false;
  return true;
}

export function isSuggestionsV3(value: unknown): value is SuggestionsV3 {
  if (!isRecord(value)) return false;
  if (!isNonEmptyString(value.generatedAt)) return false;
  if (value.mode !== "fidelity" && value.mode !== "throughput") return false;
  if (!isNonEmptyString(value.comparabilityHash)) return false;
  if (value.externalSignals !== undefined && !isExternalSignalsMetadata(value.externalSignals)) return false;
  if (value.multiBenchmark !== undefined && !isMultiBenchmarkMetadata(value.multiBenchmark)) return false;
  if (!Array.isArray(value.suggestions)) return false;
  for (const suggestion of value.suggestions) {
    if (!isRecord(suggestion)) return false;
    if (!isNonEmptyString(suggestion.id) || !isNonEmptyString(suggestion.title)) return false;
    if (!Array.isArray(suggestion.evidence) || suggestion.evidence.length === 0) return false;
    for (const evidence of suggestion.evidence) {
      if (!isRecord(evidence)) return false;
      if (!isNonEmptyString(evidence.sourceRelPath) || !isNonEmptyString(evidence.pointer)) return false;
    }
  }
  return true;
}

export function isAgentIndexV3(value: unknown): value is AgentIndexV3 {
  if (!isRecord(value)) return false;
  if (value.contractVersion !== "v3") return false;
  if (!isNonEmptyString(value.comparabilityHash)) return false;
  if (!isRecord(value.entrypoints)) return false;
  if (value.entrypoints.run !== "run.json") return false;
  if (value.entrypoints.results !== "results.json") return false;
  if (value.entrypoints.suggestions !== "suggestions.json") return false;
  if (value.compatibility !== undefined) {
    if (!isRecord(value.compatibility)) return false;
    const mapping = value.compatibility.legacyToCanonical;
    if (!Array.isArray(mapping)) return false;
    for (const row of mapping) {
      if (!isRecord(row)) return false;
      if (!isNonEmptyString(row.legacyArtifact)) return false;
      const canonical = row.canonicalArtifact;
      if (canonical !== "run.json" && canonical !== "results.json" && canonical !== "suggestions.json" && canonical !== "agent-index.json") {
        return false;
      }
    }
  }
  if (value.machineOutput !== undefined) {
    if (!isRecord(value.machineOutput)) return false;
    if (value.machineOutput.artifactProfile !== "lean" && value.machineOutput.artifactProfile !== "standard" && value.machineOutput.artifactProfile !== "diagnostics") {
      return false;
    }
    if (typeof value.machineOutput.estimatedTokens !== "number" || value.machineOutput.estimatedTokens < 0) return false;
    if (typeof value.machineOutput.droppedByTokenBudget !== "number" || value.machineOutput.droppedByTokenBudget < 0) return false;
    if (typeof value.machineOutput.topSuggestionsCap !== "number" || value.machineOutput.topSuggestionsCap < 1) return false;
  }
  if (!Array.isArray(value.topSuggestions)) return false;
  for (const suggestion of value.topSuggestions) {
    if (!isRecord(suggestion)) return false;
    if (!isNonEmptyString(suggestion.id) || !isNonEmptyString(suggestion.title)) return false;
    if (typeof suggestion.priorityScore !== "number") return false;
    if (suggestion.confidence !== "high" && suggestion.confidence !== "medium" && suggestion.confidence !== "low") return false;
    if (!isNonEmptyString(suggestion.pointer)) return false;
  }
  return true;
}
