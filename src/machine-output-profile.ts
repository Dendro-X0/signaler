import type { SuggestionV3 } from "./contracts/v3/suggestions-v3.js";

export type MachineArtifactProfile = "lean" | "standard" | "diagnostics";

export type MachineProfileCaps = {
  readonly topSuggestionsCap: number;
  readonly defaultTokenBudget: number;
};

export function getMachineProfileCaps(profile: MachineArtifactProfile): MachineProfileCaps {
  if (profile === "standard") {
    return { topSuggestionsCap: 25, defaultTokenBudget: 16_000 };
  }
  if (profile === "diagnostics") {
    return { topSuggestionsCap: 50, defaultTokenBudget: 32_000 };
  }
  return { topSuggestionsCap: 12, defaultTokenBudget: 8_000 };
}

export function estimateTokens(value: unknown): number {
  const bytes: number = Buffer.byteLength(JSON.stringify(value), "utf8");
  return Math.ceil(bytes / 4);
}

export function buildTopSuggestionRefs(
  suggestions: readonly SuggestionV3[],
  maxCount: number,
): readonly {
  readonly id: string;
  readonly title: string;
  readonly priorityScore: number;
  readonly confidence: "high" | "medium" | "low";
  readonly pointer: string;
}[] {
  return suggestions.slice(0, maxCount).map((s) => ({
    id: s.id,
    title: s.title,
    priorityScore: s.priorityScore,
    confidence: s.confidence,
    pointer: `suggestions[?(@.id==\"${s.id}\")]`,
  }));
}
