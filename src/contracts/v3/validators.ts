import type { AgentIndexV3 } from "./agent-index-v3.js";
import type { ResultsV3 } from "./results-v3.js";
import type { SuggestionsV3 } from "./suggestions-v3.js";

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

export function isResultsV3(value: unknown): value is ResultsV3 {
  if (!isRecord(value)) return false;
  if (typeof value.generatedAt !== "string") return false;
  if (!Array.isArray(value.results)) return false;
  return true;
}

export function isSuggestionsV3(value: unknown): value is SuggestionsV3 {
  if (!isRecord(value)) return false;
  if (typeof value.generatedAt !== "string") return false;
  if (!Array.isArray(value.suggestions)) return false;
  return true;
}

export function isAgentIndexV3(value: unknown): value is AgentIndexV3 {
  if (!isRecord(value)) return false;
  if (value.contractVersion !== "v3") return false;
  if (typeof value.comparabilityHash !== "string") return false;
  if (!Array.isArray(value.topSuggestions)) return false;
  return true;
}
