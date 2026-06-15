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
      resolve(outDir, "run.json"),
      JSON.stringify({ completedAt: "2026-05-28T11:00:30.000Z" }),
      "utf8",
    );
    await writeFile(
      resolve(outDir, "job-latest.json"),
      JSON.stringify({
        schemaVersion: 1,
        jobId: "job-test",
        status: "success",
        startedAt: "2026-05-28T11:00:00.000Z",
        completedAt: "2026-05-28T11:00:35.000Z",
        elapsedMs: 35000,
        steps: [{ command: "run", exitCode: 0, elapsedMs: 30000 }],
        primaryArtifacts: [],
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
        combos: [
          {
            label: "home",
            path: "/",
            device: "mobile",
            auditStatus: "scored",
            counts: { red: 2, yellow: 0, actionable: 2 },
            issues: [
              {
                id: "unused-javascript",
                title: "Reduce unused JavaScript",
                severity: "red",
                kind: "opportunity",
                estimatedSavingsMs: 900,
              },
            ],
            pointer: "performance-triage.json#/combos/0",
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
      const payload = JSON.parse(logs.join("\n")) as {
        view: string;
        reportingModel: string;
        artifactStatus?: { state: string };
      };
      expect(payload.view).toBe("perf");
      expect(payload.reportingModel).toBe("issue-count");
      expect(payload.artifactStatus?.state).toBe("fresh");
    });
  });

  it("surfaces stale artifact status when latest job failed before run", async () => {
    await withArtifacts(async (root) => {
      const outDir = resolve(root, ".signaler");
      await writeFile(
        resolve(outDir, "run.json"),
        JSON.stringify({ completedAt: "2026-05-28T10:00:00.000Z" }),
        "utf8",
      );
      await writeFile(
        resolve(outDir, "job-latest.json"),
        JSON.stringify({
          schemaVersion: 1,
          jobId: "job-stale",
          status: "failed",
          startedAt: "2026-05-28T11:00:00.000Z",
          completedAt: "2026-05-28T11:00:01.000Z",
          elapsedMs: 1,
          steps: [],
          primaryArtifacts: [],
          failureReason: "managed-serve",
          failureMessage: "startup timeout",
        }),
        "utf8",
      );
      const logs: string[] = [];
      const original = console.log;
      console.log = (value?: unknown) => {
        logs.push(String(value));
      };
      try {
        await runQueryCli(["node", "signaler", "query", "--dir", outDir, "--view", "perf", "--top", "5"]);
      } finally {
        console.log = original;
      }
      const payload = JSON.parse(logs.join("\n")) as {
        artifactStatus?: { state: string; trustArtifacts: boolean; warnings: string[] };
      };
      expect(payload.artifactStatus?.state).toBe("stale");
      expect(payload.artifactStatus?.trustArtifacts).toBe(false);
      expect(payload.artifactStatus?.warnings.length).toBeGreaterThan(0);
    });
  });
});
