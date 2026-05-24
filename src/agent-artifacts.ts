import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import type { AgentIndexV3, ResultsV3, SuggestionV3, SuggestionsV3 } from "./engine-contracts/artifacts/v3/index.js";
import { isAgentIndexV3, isResultsV3, isSuggestionsV3 } from "./engine-contracts/artifacts/v3/index.js";
import type { AnalyzeReportV6 } from "./engine-contracts/artifacts/v6/index.js";
import { isAnalyzeReportV6 } from "./engine-contracts/artifacts/v6/index.js";
import type { PerformanceTriageV3 } from "./engine-contracts/artifacts/v3/index.js";
import { isPerformanceTriageV3 } from "./performance-triage.js";

export type LoadedAgentArtifacts = {
  readonly dir: string;
  readonly agentIndex?: AgentIndexV3;
  readonly suggestions?: SuggestionsV3;
  readonly results?: ResultsV3;
  readonly analyze?: AnalyzeReportV6;
  readonly performanceTriage?: PerformanceTriageV3;
};

async function readJson(path: string): Promise<unknown> {
  const raw = await readFile(path, "utf8");
  return JSON.parse(raw) as unknown;
}

export async function loadAgentArtifacts(dir: string): Promise<LoadedAgentArtifacts> {
  const root = resolve(dir);
  let agentIndex: AgentIndexV3 | undefined;
  let suggestions: SuggestionsV3 | undefined;
  let results: ResultsV3 | undefined;
  let analyze: AnalyzeReportV6 | undefined;
  let performanceTriage: PerformanceTriageV3 | undefined;

  try {
    const parsed = await readJson(resolve(root, "agent-index.json"));
    if (isAgentIndexV3(parsed)) {
      agentIndex = parsed;
    }
  } catch {
    // optional
  }

  try {
    const parsed = await readJson(resolve(root, "suggestions.json"));
    if (isSuggestionsV3(parsed)) {
      suggestions = parsed;
    }
  } catch {
    // optional
  }

  try {
    const parsed = await readJson(resolve(root, "results.json"));
    if (isResultsV3(parsed)) {
      results = parsed;
    }
  } catch {
    // optional
  }

  try {
    const parsed = await readJson(resolve(root, "analyze.json"));
    if (isAnalyzeReportV6(parsed)) {
      analyze = parsed;
    }
  } catch {
    // optional
  }

  try {
    const parsed = await readJson(resolve(root, "performance-triage.json"));
    if (isPerformanceTriageV3(parsed)) {
      performanceTriage = parsed;
    }
  } catch {
    // optional
  }

  return { dir: root, agentIndex, suggestions, results, analyze, performanceTriage };
}

export function findSuggestionById(suggestions: SuggestionsV3, id: string): SuggestionV3 | undefined {
  return suggestions.suggestions.find((s) => s.id === id);
}

export function findPerformanceIssueById(triage: PerformanceTriageV3, id: string): PerformanceTriageV3["uniqueIssues"][number] | undefined {
  return triage.uniqueIssues.find((issue) => issue.id === id);
}

export async function markAgentIndexPartialSuccess(outputDir: string): Promise<void> {
  const agentIndexPath = resolve(outputDir, "agent-index.json");
  let parsed: unknown;
  try {
    parsed = await readJson(agentIndexPath);
  } catch {
    return;
  }
  if (!isAgentIndexV3(parsed)) {
    return;
  }
  const agentIndex = parsed as AgentIndexV3;
  if (agentIndex.partialSuccess) {
    return;
  }
  const updated: AgentIndexV3 = {
    ...agentIndex,
    partialSuccess: {
      reason: "analyze-failed",
      message: "Run completed; analyze step failed. Use performance-triage.json and signaler query --view perf.",
      fallbackArtifacts: ["performance-triage.json", "results.json"],
    },
  };
  const { writeFile } = await import("node:fs/promises");
  await writeFile(agentIndexPath, `${JSON.stringify(updated, null, 2)}\n`, "utf8");
}
