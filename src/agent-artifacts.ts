import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { resolveArtifactPath, resolveFlatPathForId } from "./artifact-layout/index.js";
import type { AgentIndexV3, ResultsV3, SuggestionV3, SuggestionsV3 } from "./engine-contracts/artifacts/v3/index.js";
import { isAgentIndexV3, isResultsV3, isSuggestionsV3 } from "./engine-contracts/artifacts/v3/index.js";
import type { AnalyzeReportV6 } from "./engine-contracts/artifacts/v6/index.js";
import { isAnalyzeReportV6 } from "./engine-contracts/artifacts/v6/index.js";
import type { PerformanceTriageV3 } from "./engine-contracts/artifacts/v3/index.js";
import { isPerformanceTriageV3 } from "./performance-triage.js";
import type { AuditCoverageV1 } from "./audit-coverage.js";
import { isAuditCoverageV1 } from "./audit-coverage.js";
import type { FixQueueV1 } from "./fix-queue.js";
import { isFixQueueV1 } from "./fix-queue.js";

export type LoadedAgentArtifacts = {
  readonly dir: string;
  readonly agentIndex?: AgentIndexV3;
  readonly suggestions?: SuggestionsV3;
  readonly results?: ResultsV3;
  readonly analyze?: AnalyzeReportV6;
  readonly performanceTriage?: PerformanceTriageV3;
  readonly coverage?: AuditCoverageV1;
  readonly fixQueue?: FixQueueV1;
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
  let coverage: AuditCoverageV1 | undefined;
  let fixQueue: FixQueueV1 | undefined;

  try {
    const parsed = await readJson(await resolveArtifactPath(root, "agent-index"));
    if (isAgentIndexV3(parsed)) {
      agentIndex = parsed;
    }
  } catch {
    // optional
  }

  try {
    const parsed = await readJson(await resolveArtifactPath(root, "suggestions"));
    if (isSuggestionsV3(parsed)) {
      suggestions = parsed;
    }
  } catch {
    // optional
  }

  try {
    const parsed = await readJson(await resolveArtifactPath(root, "results"));
    if (isResultsV3(parsed)) {
      results = parsed;
    }
  } catch {
    // optional
  }

  try {
    const parsed = await readJson(await resolveArtifactPath(root, "analyze"));
    if (isAnalyzeReportV6(parsed)) {
      analyze = parsed;
    }
  } catch {
    // optional
  }

  try {
    const parsed = await readJson(await resolveArtifactPath(root, "performance-triage"));
    if (isPerformanceTriageV3(parsed)) {
      performanceTriage = parsed;
    }
  } catch {
    // optional
  }

  try {
    const parsed = await readJson(await resolveArtifactPath(root, "coverage"));
    if (isAuditCoverageV1(parsed)) {
      coverage = parsed;
    }
  } catch {
    // optional
  }

  try {
    const parsed = await readJson(await resolveArtifactPath(root, "fix-queue"));
    if (isFixQueueV1(parsed)) {
      fixQueue = parsed;
    }
  } catch {
    // optional
  }

  return { dir: root, agentIndex, suggestions, results, analyze, performanceTriage, coverage, fixQueue };
}

export function findSuggestionById(suggestions: SuggestionsV3, id: string): SuggestionV3 | undefined {
  return suggestions.suggestions.find((s) => s.id === id);
}

export function findPerformanceIssueById(triage: PerformanceTriageV3, id: string): PerformanceTriageV3["uniqueIssues"][number] | undefined {
  return triage.uniqueIssues.find((issue) => issue.id === id);
}

export async function markAgentIndexPartialSuccess(outputDir: string): Promise<void> {
  const root = resolve(outputDir);
  const agentIndexPath = await resolveArtifactPath(root, "agent-index");
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
  await writeFile(resolve(root, resolveFlatPathForId("agent-index")), `${JSON.stringify(updated, null, 2)}\n`, "utf8");
}
