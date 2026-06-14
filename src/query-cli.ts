import { readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { evaluateArtifactFreshness } from "./artifact-freshness.js";
import { findPerformanceIssueById, findSuggestionById, loadAgentArtifacts } from "./agent-artifacts.js";
import { shouldFailOnDeltaProjection } from "./baseline-compare.js";
import type { BaselineCompareConfig } from "./core/types.js";
import { buildDeltaProjection } from "./query-delta.js";
import { buildCoverageProjection } from "./query-coverage.js";
import { resolveArtifactPath } from "./artifact-layout/index.js";

type QueryView = "agent" | "actions" | "perf" | "run" | "evidence" | "delta" | "coverage" | "fix-queue";

type QueryArgs = {
  readonly dir: string;
  readonly view: QueryView;
  readonly id?: string;
  readonly top: number;
  readonly json: boolean;
  readonly out?: string;
  readonly baselineDir?: string;
  readonly compareDir?: string;
  readonly failOnRegression: boolean;
  readonly baselinePolicy?: BaselineCompareConfig;
};

function parseArgs(argv: readonly string[]): QueryArgs {
  let dir = resolve(".signaler");
  let view: QueryView = "agent";
  let id: string | undefined;
  let top = 12;
  let json = true;
  let out: string | undefined;
  let baselineDir: string | undefined;
  let compareDir: string | undefined;
  let failOnRegression = false;
  let maxRedIncrease: number | undefined;

  for (let i = 2; i < argv.length; i += 1) {
    const arg = argv[i] ?? "";
    if ((arg === "--dir" || arg === "--output-dir") && i + 1 < argv.length) {
      dir = resolve(argv[i + 1] ?? dir);
      i += 1;
      continue;
    }
    if (arg === "--view" && i + 1 < argv.length) {
      const value = argv[i + 1] ?? "";
      if (value !== "agent" && value !== "actions" && value !== "perf" && value !== "run" && value !== "evidence" && value !== "delta" && value !== "coverage" && value !== "fix-queue") {
        throw new Error(`Invalid --view value: ${value}. Expected agent|actions|perf|run|evidence|delta|coverage|fix-queue.`);
      }
      view = value;
      i += 1;
      continue;
    }
    if (arg === "--id" && i + 1 < argv.length) {
      id = argv[i + 1];
      i += 1;
      continue;
    }
    if (arg === "--top" && i + 1 < argv.length) {
      const parsed = Number.parseInt(argv[i + 1] ?? "", 10);
      if (!Number.isFinite(parsed) || parsed < 1 || parsed > 100) {
        throw new Error(`Invalid --top value: ${argv[i + 1]}. Expected integer 1..100.`);
      }
      top = parsed;
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
    if (arg === "--out" && i + 1 < argv.length) {
      out = resolve(argv[i + 1] ?? "");
      i += 1;
    }
    if ((arg === "--baseline-dir" || arg === "--baseline") && i + 1 < argv.length) {
      baselineDir = resolve(argv[i + 1] ?? "");
      i += 1;
      continue;
    }
    if (arg === "--compare-dir" && i + 1 < argv.length) {
      compareDir = resolve(argv[i + 1] ?? "");
      i += 1;
      continue;
    }
    if (arg === "--fail-on-regression") {
      failOnRegression = true;
      continue;
    }
    if (arg === "--max-red-increase" && i + 1 < argv.length) {
      const parsed = Number.parseInt(argv[i + 1] ?? "", 10);
      if (!Number.isFinite(parsed) || parsed < 0) {
        throw new Error(`Invalid --max-red-increase value: ${argv[i + 1]}. Expected non-negative integer.`);
      }
      maxRedIncrease = parsed;
      i += 1;
      continue;
    }
  }

  if (baselineDir !== undefined && compareDir === undefined) {
    compareDir = dir;
  }
  if (compareDir !== undefined && baselineDir === undefined) {
    throw new Error("compare mode requires --baseline or --baseline-dir when using --compare-dir.");
  }

  if (view === "evidence" && (id === undefined || id.length === 0)) {
    throw new Error("evidence view requires --id <suggestion-or-issue-id>.");
  }

  const baselinePolicy: BaselineCompareConfig | undefined =
    maxRedIncrease !== undefined ? { maxRedIncrease } : undefined;

  return { dir, view, id, top, json, out, baselineDir, compareDir, failOnRegression, baselinePolicy };
}

function emit(payload: unknown, args: QueryArgs): void {
  const text = JSON.stringify(payload, null, args.json ? 2 : undefined);
  if (args.out !== undefined) {
    void writeFile(args.out, `${text}\n`, "utf8");
    return;
  }
  console.log(text);
}

export async function runQueryCli(argv: readonly string[]): Promise<void> {
  const args = parseArgs(argv);
  const artifacts = await loadAgentArtifacts(args.dir);
  const artifactStatus = await evaluateArtifactFreshness(args.dir);

  if (args.view === "delta") {
    const projection = await buildDeltaProjection({
      dir: args.dir,
      baselineDir: args.baselineDir,
      compareDir: args.compareDir,
    });
    emit({ ...projection, artifactStatus }, args);
    if (args.failOnRegression && args.baselineDir !== undefined && args.compareDir !== undefined) {
      const policy: BaselineCompareConfig = {
        maxRedIncrease: 0,
        requireComparabilityMatch: true,
        ...args.baselinePolicy,
      };
      if (shouldFailOnDeltaProjection(projection, policy)) {
        process.exitCode = 1;
      }
    }
    return;
  }

  if (args.view === "agent") {
    if (artifacts.fixQueue !== undefined) {
      emit(
        {
          view: "agent",
          primaryArtifact: "fix-queue.json",
          comparabilityHash: artifacts.fixQueue.comparabilityHash,
          fixLoop: artifacts.fixQueue.fixLoop,
          itemCount: artifacts.fixQueue.items.length,
          topItems: artifacts.fixQueue.items.slice(0, args.top).map((item) => ({
            rank: item.rank,
            actionId: item.actionId,
            title: item.title,
            category: item.category,
            priorityScore: item.priorityScore,
            targetCount: item.targets.length,
            topTarget: item.targets[0],
            source: item.source,
          })),
          agentProtocol: {
            mandatoryReads: ["fix-queue.json", "coverage.json"],
            optionalReads: ["analyze.json", "performance-triage.json", "verify.json"],
            expandCommand: "signaler explain --id <action-id>",
            fixQueueCommand: "signaler query --view fix-queue --dir .signaler --json",
            coverageCommand: "signaler query --view coverage --dir .signaler",
          },
          artifactStatus,
        },
        args,
      );
      return;
    }
    if (artifacts.analyze !== undefined) {
      emit(
        {
          view: "agent",
          primaryArtifact: "analyze.json",
          comparabilityHash: artifacts.analyze.source.runComparabilityHash,
          actionCount: artifacts.analyze.actions.length,
          topActions: artifacts.analyze.actions.slice(0, args.top).map((action) => ({
            id: action.id,
            title: action.title,
            confidence: action.confidence,
            category: action.category,
          })),
          agentProtocol: {
            mandatoryReads: ["analyze.json"],
            optionalReads: ["coverage.json", "verify.json", "performance-triage.json"],
            expandCommand: "signaler explain --id <action-id>",
            coverageCommand: "signaler query --view coverage --dir .signaler",
          },
          artifactStatus,
        },
        args,
      );
      return;
    }
    if (artifacts.agentIndex === undefined) {
      throw new Error(`Missing agent entrypoint in ${args.dir}. Run signaler run --contract v3 first, or signaler analyze --contract v6.`);
    }
    emit(
      {
        view: "agent",
        primaryArtifact: "agent-index.json",
        comparabilityHash: artifacts.agentIndex.comparabilityHash,
        topSuggestions: artifacts.agentIndex.topSuggestions.slice(0, args.top),
        performanceReporting: artifacts.agentIndex.performanceReporting ?? "issue-count",
        performanceScoreSemantics: artifacts.agentIndex.performanceScoreSemantics,
        entrypoints: artifacts.agentIndex.entrypoints,
        coverage: artifacts.coverage?.totals,
        agentProtocol: artifacts.agentIndex.agentProtocol,
        partialSuccess: artifacts.agentIndex.partialSuccess,
        artifactStatus,
      },
      args,
    );
    return;
  }

  if (args.view === "actions") {
    if (artifacts.analyze !== undefined) {
      emit(
        {
          view: "actions",
          source: "analyze.json",
          actions: artifacts.analyze.actions.slice(0, args.top),
          artifactStatus,
        },
        args,
      );
      return;
    }
    if (artifacts.agentIndex !== undefined) {
      emit(
        {
          view: "actions",
          source: "agent-index.json",
          actions: artifacts.agentIndex.topSuggestions.slice(0, args.top),
          artifactStatus,
        },
        args,
      );
      return;
    }
    throw new Error(`No actions found in ${args.dir}.`);
  }

  if (args.view === "fix-queue") {
    if (artifacts.fixQueue === undefined) {
      throw new Error(`Missing fix-queue.json in ${args.dir}. Run signaler analyze --contract v6 after audit.`);
    }
    emit(
      {
        view: "fix-queue",
        comparabilityHash: artifacts.fixQueue.comparabilityHash,
        fixLoop: artifacts.fixQueue.fixLoop,
        totals: artifacts.fixQueue.totals,
        items: artifacts.fixQueue.items.slice(0, args.top),
        artifactStatus,
      },
      args,
    );
    return;
  }

  if (args.view === "coverage") {
    if (artifacts.coverage === undefined) {
      throw new Error(`Missing coverage.json in ${args.dir}. Re-run with signaler run --contract v3 or signaler audit.`);
    }
    emit({ ...buildCoverageProjection({ coverage: artifacts.coverage, top: args.top }), artifactStatus }, args);
    return;
  }

  if (args.view === "perf") {
    if (artifacts.performanceTriage === undefined) {
      throw new Error(`Missing performance-triage.json in ${args.dir}. Re-run with signaler run --contract v3.`);
    }
    emit(
      {
        view: "perf",
        reportingModel: artifacts.performanceTriage.reportingModel,
        coverage: artifacts.performanceTriage.coverage,
        totals: artifacts.performanceTriage.totals,
        categoryScores: artifacts.performanceTriage.categoryScores,
        uniqueIssues: artifacts.performanceTriage.uniqueIssues.slice(0, args.top),
        disclaimer: artifacts.performanceTriage.disclaimer,
        artifactStatus,
      },
      args,
    );
    return;
  }

  if (args.view === "run") {
    const runPath = await resolveArtifactPath(args.dir, "run");
    const raw = await readFile(runPath, "utf8");
    const parsed = JSON.parse(raw) as unknown;
    const protocol =
      typeof parsed === "object" && parsed !== null && "protocol" in parsed
        ? (parsed as { protocol: unknown }).protocol
        : parsed;
    emit({ view: "run", protocol, artifactStatus }, args);
    return;
  }

  const issueId = args.id ?? "";
  if (artifacts.suggestions !== undefined) {
    const suggestion = findSuggestionById(artifacts.suggestions, issueId);
    if (suggestion !== undefined) {
      emit({ view: "evidence", kind: "suggestion", item: suggestion }, args);
      return;
    }
  }
  if (artifacts.performanceTriage !== undefined) {
    const issue = findPerformanceIssueById(artifacts.performanceTriage, issueId);
    if (issue !== undefined) {
      emit({ view: "evidence", kind: "performance-issue", item: issue }, args);
      return;
    }
  }
  throw new Error(`No evidence found for id "${issueId}" in ${args.dir}.`);
}
