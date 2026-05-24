import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { describe, expect, it, vi } from "vitest";
import { printAuditSummary } from "../src/report-summary.js";

describe("report summary", () => {
  it("prints one-screen audit summary from canonical artifacts", async () => {
    const root = await mkdtemp(join(tmpdir(), "signaler-summary-"));
    const outDir = resolve(root, ".signaler");
    await mkdir(outDir, { recursive: true });
    await writeFile(
      resolve(outDir, "discovery.json"),
      JSON.stringify(
        {
          totals: { detected: 43, selected: 12 },
          coverage: {
            auditedCoveragePct: 28,
            excludedReasons: { scope: 28, filter: 0, dynamic: 3 },
            recommendFullScope: true,
          },
        },
        null,
        2,
      ),
      "utf8",
    );
    await writeFile(
      resolve(outDir, "run.json"),
      JSON.stringify({ meta: { comboCount: 24, resolvedParallel: 6, elapsedMs: 93000 } }, null, 2),
      "utf8",
    );
    await writeFile(
      resolve(outDir, "performance-triage.json"),
      JSON.stringify(
        {
          generatedAt: new Date().toISOString(),
          contractVersion: "v3",
          reportingModel: "issue-count",
          totals: { red: 12, yellow: 4, actionable: 16 },
          uniqueIssues: [
            {
              id: "unused-javascript",
              title: "Reduce unused JavaScript",
              severity: "red",
              affectedCombos: 8,
              totalEstimatedSavingsMs: 1200,
            },
          ],
        },
        null,
        2,
      ),
      "utf8",
    );
  await writeFile(
      resolve(outDir, "analyze.json"),
      JSON.stringify(
        {
          actions: [{ id: "act-1", title: "Split vendor bundle", priorityScore: 900 }],
        },
        null,
        2,
      ),
      "utf8",
    );

    const logs: string[] = [];
    const spy = vi.spyOn(console, "log").mockImplementation((line?: unknown) => {
      logs.push(String(line ?? ""));
    });
    try {
      await printAuditSummary({ outputDir: outDir });
    } finally {
      spy.mockRestore();
    }

    const output = logs.join("\n");
    expect(output).toContain("auditing 12/43 routes (28%)");
    expect(output).toContain("24 combos");
    expect(output).toContain("12 red");
    expect(output).toContain("Reduce unused JavaScript");
    expect(output).toContain("Split vendor bundle");
    await rm(root, { recursive: true, force: true });
  });
});
