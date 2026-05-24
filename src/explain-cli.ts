import { resolve } from "node:path";
import { findPerformanceIssueById, findSuggestionById, loadAgentArtifacts } from "./agent-artifacts.js";
import type { ResultsV3Line } from "./engine-contracts/artifacts/v3/index.js";

type ExplainArgs = {
  readonly dir: string;
  readonly id: string;
  readonly json: boolean;
};

function parseArgs(argv: readonly string[]): ExplainArgs {
  let dir = resolve(".signaler");
  let id: string | undefined;
  let json = true;

  for (let i = 2; i < argv.length; i += 1) {
    const arg = argv[i] ?? "";
    if ((arg === "--dir" || arg === "--output-dir") && i + 1 < argv.length) {
      dir = resolve(argv[i + 1] ?? dir);
      i += 1;
      continue;
    }
    if (arg === "--id" && i + 1 < argv.length) {
      id = argv[i + 1];
      i += 1;
      continue;
    }
    if (arg === "--json") {
      json = true;
      continue;
    }
    if (arg === "--no-json") {
      json = false;
      continue;
    }
  }

  if (id === undefined || id.length === 0) {
    throw new Error("explain requires --id <suggestion-or-issue-id>.");
  }

  return { dir, id, json };
}

function matchComboLines(results: readonly ResultsV3Line[], issueId: string): readonly ResultsV3Line[] {
  return results.filter(
    (line) =>
      line.opportunities.some((o) => o.id === issueId)
      || line.failedAudits.some((audit) => audit.id === issueId),
  );
}

export async function runExplainCli(argv: readonly string[]): Promise<void> {
  const args = parseArgs(argv);
  const artifacts = await loadAgentArtifacts(args.dir);

  if (artifacts.analyze !== undefined) {
    const action = artifacts.analyze.actions.find((entry) => entry.id === args.id);
    if (action !== undefined) {
      const text = JSON.stringify({ kind: "analyze-action", action }, null, args.json ? 2 : undefined);
      console.log(text);
      return;
    }
  }

  if (artifacts.suggestions !== undefined) {
    const suggestion = findSuggestionById(artifacts.suggestions, args.id);
    if (suggestion !== undefined) {
      const relatedCombos =
        artifacts.results === undefined
          ? []
          : matchComboLines(artifacts.results.results, extractIssueIdFromSuggestion(suggestion.id));
      const payload = {
        kind: "suggestion",
        suggestion,
        relatedCombos: relatedCombos.map((line) => ({
          label: line.label,
          path: line.path,
          device: line.device,
          metrics: line.metrics,
          opportunities: line.opportunities.filter((o) => o.id === extractIssueIdFromSuggestion(suggestion.id)),
          failedAudits: line.failedAudits.filter((audit) => audit.id === extractIssueIdFromSuggestion(suggestion.id)),
        })),
      };
      console.log(JSON.stringify(payload, null, args.json ? 2 : undefined));
      return;
    }
  }

  if (artifacts.performanceTriage !== undefined) {
    const issue = findPerformanceIssueById(artifacts.performanceTriage, args.id);
    if (issue !== undefined) {
      const relatedCombos = artifacts.results === undefined ? [] : matchComboLines(artifacts.results.results, issue.id);
      console.log(
        JSON.stringify(
          {
            kind: "performance-issue",
            issue,
            relatedCombos: relatedCombos.map((line) => ({
              label: line.label,
              path: line.path,
              device: line.device,
              metrics: line.metrics,
            })),
          },
          null,
          args.json ? 2 : undefined,
        ),
      );
      return;
    }
  }

  throw new Error(`No explain target found for id "${args.id}" in ${args.dir}.`);
}

function extractIssueIdFromSuggestion(suggestionId: string): string {
  const match = /^sugg-(.+)-\d+$/.exec(suggestionId);
  return match?.[1] ?? suggestionId;
}
