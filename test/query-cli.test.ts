import { mkdir, writeFile } from "node:fs/promises";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { runQueryCli } from "../src/query-cli.js";

async function withArtifacts(
  fn: (root: string) => Promise<void>,
): Promise<void> {
  const root = await mkdtemp(join(tmpdir(), "signaler-query-"));
  try {
    const outDir = resolve(root, ".signaler");
    await mkdir(outDir, { recursive: true });
    await writeFile(
      resolve(outDir, "agent-index.json"),
      JSON.stringify({
        generatedAt: new Date().toISOString(),
        contractVersion: "v3",
        mode: "throughput",
        profile: "throughput-balanced",
        comparabilityHash: "cmp-1",
        tokenBudget: 8000,
        entrypoints: {
          run: "run.json",
          results: "results.json",
          suggestions: "suggestions.json",
          performanceTriage: "performance-triage.json",
        },
        performanceReporting: "issue-count",
        topSuggestions: [
          {
            id: "sugg-unused-javascript-1",
            title: "Reduce unused JavaScript",
            priorityScore: 900,
            confidence: "high",
            pointer: "suggestions[?(@.id==\"sugg-unused-javascript-1\")]",
          },
        ],
      }),
      "utf8",
    );
    await writeFile(
      resolve(outDir, "performance-triage.json"),
      JSON.stringify({
        generatedAt: new Date().toISOString(),
        contractVersion: "v3",
        reportingModel: "issue-count",
        comparabilityHash: "cmp-1",
        mode: "throughput",
        options: { includeYellow: false },
        disclaimer: "test",
        categoryScores: { note: "test" },
        totals: { red: 2, yellow: 0, green: 0, actionable: 2 },
        uniqueIssues: [
          {
            id: "unused-javascript",
            title: "Reduce unused JavaScript",
            severity: "red",
            kind: "opportunity",
            affectedCombos: 2,
            totalEstimatedSavingsMs: 900,
            pointer: "performance-triage.json#/uniqueIssues/0",
          },
        ],
      }),
      "utf8",
    );
    await fn(root);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
}

describe("query-cli", () => {
  it("returns perf view projection", async () => {
    await withArtifacts(async (root) => {
      const logs: string[] = [];
      const original = console.log;
      console.log = (value?: unknown) => {
        logs.push(String(value));
      };
      try {
        await runQueryCli(["node", "signaler", "query", "--dir", resolve(root, ".signaler"), "--view", "perf", "--top", "5"]);
      } finally {
        console.log = original;
      }
      const payload = JSON.parse(logs.join("\n")) as { view: string; reportingModel: string };
      expect(payload.view).toBe("perf");
      expect(payload.reportingModel).toBe("issue-count");
    });
  });
});
