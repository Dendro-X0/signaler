import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { runReportCli } from "../src/report-cli.js";

describe("report-cli v3 fallback", () => {
  it("generates report artifacts without ai-ledger.json", async () => {
    const root = await mkdtemp(join(tmpdir(), "signaler-report-v3-"));
    const outDir = resolve(root, ".signaler");
    await mkdir(outDir, { recursive: true });
    await writeFile(
      resolve(outDir, "issues.json"),
      JSON.stringify(
        {
          generatedAt: new Date().toISOString(),
          targetScore: 95,
          totals: { combos: 2, redCombos: 0, yellowCombos: 1, greenCombos: 1, runtimeErrors: 0 },
          topIssues: [{ id: "unused-javascript", title: "Reduce unused JavaScript", count: 1, totalMs: 900 }],
          failing: [],
        },
        null,
        2,
      ),
      "utf8",
    );
    await writeFile(
      resolve(outDir, "suggestions.json"),
      JSON.stringify(
        {
          generatedAt: new Date().toISOString(),
          mode: "throughput",
          comparabilityHash: "hash-1",
          suggestions: [
            {
              id: "sugg-unused-javascript-1",
              title: "Reduce unused JavaScript",
              category: "performance",
              priorityScore: 1200,
              confidence: "high",
              estimatedImpact: { timeMs: 900, affectedCombos: 1 },
              evidence: [{ sourceRelPath: "issues.json", pointer: "/topIssues/0" }],
              action: { summary: "Split bundles.", steps: ["Inspect", "Fix", "Rerun"], effort: "medium" },
              modeApplicability: ["throughput", "fidelity"],
            },
          ],
        },
        null,
        2,
      ),
      "utf8",
    );

    await runReportCli(["node", "signaler", "report", "--output-dir", outDir]);

    const aiGlobalRed = JSON.parse(await readFile(resolve(outDir, "ai-global-red.json"), "utf8")) as { readonly meta?: { readonly source?: string } };
    const md = await readFile(resolve(outDir, "global-red.report.md"), "utf8");

    expect(aiGlobalRed.meta?.source).toBe("v3-canonical");
    expect(md.includes("Reduce unused JavaScript")).toBe(true);
    await rm(root, { recursive: true, force: true });
  });
});
