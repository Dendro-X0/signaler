import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { describe, expect, it, vi } from "vitest";
import { runAnalyzeCli } from "../src/analyze-cli.js";
import { isAnalyzeReportV6 } from "../src/contracts/v6/validators.js";

type SuggestionFixture = {
  readonly id: string;
  readonly title: string;
  readonly category?: "performance" | "accessibility" | "best-practices" | "seo" | "reliability";
  readonly priorityScore?: number;
  readonly confidence?: "high" | "medium" | "low";
  readonly estimatedImpact?: { readonly timeMs?: number; readonly bytes?: number; readonly affectedCombos?: number };
  readonly evidence?: readonly { readonly sourceRelPath: string; readonly pointer: string }[];
  readonly actionSummary?: string;
};

async function invokeAnalyze(args: readonly string[]): Promise<number> {
  process.exitCode = 0;
  await runAnalyzeCli(["node", "signaler", ...args]);
  return process.exitCode ?? 0;
}

async function writeBaseArtifacts(params: { readonly root: string; readonly suggestions: readonly SuggestionFixture[] }): Promise<string> {
  const outDir = resolve(params.root, ".signaler");
  await mkdir(outDir, { recursive: true });

  await writeFile(
    resolve(outDir, "run.json"),
    JSON.stringify(
      {
        protocol: {
          mode: "throughput",
          profile: "throughput-balanced",
          comparabilityHash: "cmp-hash-1",
        },
      },
      null,
      2,
    ),
    "utf8",
  );

  await writeFile(
    resolve(outDir, "results.json"),
    JSON.stringify(
      {
        generatedAt: new Date().toISOString(),
        results: [
          {
            label: "Home",
            path: "/",
            url: "http://127.0.0.1:3000/",
            device: "mobile",
            scores: { performance: 45, accessibility: 95, bestPractices: 90, seo: 92 },
            metrics: { lcpMs: 2900, tbtMs: 320, cls: 0.04 },
            opportunities: [{ id: "unused-javascript", title: "Reduce unused JavaScript", estimatedSavingsMs: 900 }],
            failedAudits: [],
          },
          {
            label: "Docs",
            path: "/docs",
            url: "http://127.0.0.1:3000/docs",
            device: "desktop",
            scores: { performance: 61, accessibility: 96, bestPractices: 92, seo: 94 },
            metrics: { lcpMs: 2200, tbtMs: 180, cls: 0.03 },
            opportunities: [{ id: "unused-javascript", title: "Reduce unused JavaScript", estimatedSavingsMs: 450 }],
            failedAudits: [],
          },
          {
            label: "Blog",
            path: "/blog",
            url: "http://127.0.0.1:3000/blog",
            device: "mobile",
            scores: { performance: 70, accessibility: 97, bestPractices: 93, seo: 94 },
            metrics: { lcpMs: 1800, tbtMs: 110, cls: 0.02 },
            opportunities: [{ id: "server-response-time", title: "Reduce server response times (TTFB)", estimatedSavingsMs: 300 }],
            failedAudits: [],
          },
        ],
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
        comparabilityHash: "cmp-hash-1",
        suggestions: params.suggestions.map((suggestion) => ({
          id: suggestion.id,
          title: suggestion.title,
          category: suggestion.category ?? "performance",
          priorityScore: suggestion.priorityScore ?? 1000,
          confidence: suggestion.confidence ?? "high",
          estimatedImpact: {
            timeMs: suggestion.estimatedImpact?.timeMs ?? 900,
            ...(typeof suggestion.estimatedImpact?.bytes === "number" ? { bytes: suggestion.estimatedImpact.bytes } : {}),
            affectedCombos: suggestion.estimatedImpact?.affectedCombos ?? 2,
          },
          evidence: suggestion.evidence ?? [{ sourceRelPath: "issues.json", pointer: "/topIssues/0" }],
          action: {
            summary: suggestion.actionSummary ?? `Fix ${suggestion.title}`,
            steps: ["Inspect", "Apply fix", "Rerun"],
            effort: "medium",
          },
          modeApplicability: ["fidelity", "throughput"],
        })),
      },
      null,
      2,
    ),
    "utf8",
  );

  await writeFile(
    resolve(outDir, "agent-index.json"),
    JSON.stringify(
      {
        generatedAt: new Date().toISOString(),
        contractVersion: "v3",
        mode: "throughput",
        profile: "throughput-balanced",
        comparabilityHash: "cmp-hash-1",
        tokenBudget: 8000,
        entrypoints: {
          run: "run.json",
          results: "results.json",
          suggestions: "suggestions.json",
        },
        topSuggestions: [
          {
            id: "sugg-unused-javascript-1",
            title: "Reduce unused JavaScript",
            priorityScore: 1200,
            confidence: "high",
            pointer: "suggestions[0]",
          },
        ],
      },
      null,
      2,
    ),
    "utf8",
  );

  return outDir;
}

async function writeExternalSignalsFile(params: {
  readonly root: string;
  readonly name: string;
  readonly collectedAt?: string;
  readonly records: readonly {
    readonly id: string;
    readonly issueId: string;
    readonly path: string;
    readonly confidence?: "high" | "medium" | "low";
    readonly weight?: number;
  }[];
}): Promise<string> {
  const filePath = resolve(params.root, params.name);
  await writeFile(
    filePath,
    JSON.stringify(
      {
        schemaVersion: 1,
        adapters: [
          {
            adapterId: "custom",
            collectedAt: params.collectedAt ?? "2026-03-10T00:00:00.000Z",
            records: params.records.map((record, index) => ({
              id: record.id,
              target: {
                issueId: record.issueId,
                path: record.path,
              },
              confidence: record.confidence ?? "high",
              ...(typeof record.weight === "number" ? { weight: record.weight } : {}),
              evidence: [
                {
                  sourceRelPath: "external/custom.json",
                  pointer: `/records/${index}`,
                },
              ],
            })),
          },
        ],
      },
      null,
      2,
    ),
    "utf8",
  );
  return filePath;
}

describe("analyze-cli v6", () => {
  it("returns exit 2 in strict mode when required artifacts are missing", async () => {
    const root = await mkdtemp(join(tmpdir(), "signaler-analyze-missing-"));
    const outDir = resolve(root, ".signaler");
    await mkdir(outDir, { recursive: true });
    await writeFile(resolve(outDir, "run.json"), JSON.stringify({ protocol: { mode: "throughput", profile: "throughput-balanced", comparabilityHash: "x" } }), "utf8");

    const exitCode = await invokeAnalyze(["--contract", "v6", "--strict", "--dir", outDir]);
    expect(exitCode).toBe(2);

    await rm(root, { recursive: true, force: true });
  });

  it("returns exit 2 in strict mode when required schema is invalid", async () => {
    const root = await mkdtemp(join(tmpdir(), "signaler-analyze-invalid-"));
    const outDir = resolve(root, ".signaler");
    await mkdir(outDir, { recursive: true });
    await writeFile(resolve(outDir, "run.json"), JSON.stringify({ protocol: { mode: "throughput", profile: "throughput-balanced", comparabilityHash: "x" } }), "utf8");
    await writeFile(resolve(outDir, "results.json"), JSON.stringify({ generatedAt: new Date().toISOString(), results: [] }), "utf8");
    await writeFile(resolve(outDir, "suggestions.json"), JSON.stringify({ suggestions: [] }), "utf8");
    await writeFile(resolve(outDir, "agent-index.json"), JSON.stringify({}), "utf8");

    const exitCode = await invokeAnalyze(["--contract", "v6", "--strict", "--dir", outDir]);
    expect(exitCode).toBe(2);

    await rm(root, { recursive: true, force: true });
  });

  it("emits analyze.json and analyze.md with deterministic output", async () => {
    const root = await mkdtemp(join(tmpdir(), "signaler-analyze-valid-"));
    const outDir = await writeBaseArtifacts({
      root,
      suggestions: [
        { id: "sugg-unused-javascript-1", title: "Reduce unused JavaScript", priorityScore: 1500, confidence: "high", estimatedImpact: { timeMs: 1200, affectedCombos: 2 } },
        { id: "sugg-server-response-time-2", title: "Reduce server response times (TTFB)", priorityScore: 900, confidence: "medium", estimatedImpact: { timeMs: 300, affectedCombos: 1 } },
      ],
    });

    const exitCodeFirst = await invokeAnalyze(["--contract", "v6", "--dir", outDir, "--artifact-profile", "lean", "--top-actions", "12", "--json"]);
    expect(exitCodeFirst).toBe(0);
    const firstReport = JSON.parse(await readFile(resolve(outDir, "analyze.json"), "utf8")) as {
      readonly actions: unknown;
      readonly externalSignals?: {
        readonly enabled: boolean;
        readonly inputFiles: readonly string[];
        readonly accepted: number;
        readonly rejected: number;
        readonly digest: string | null;
        readonly policy: string;
      };
    };
    expect(isAnalyzeReportV6(firstReport)).toBe(true);
    expect(firstReport.externalSignals).toBeDefined();
    expect(firstReport.externalSignals?.enabled).toBe(false);
    expect(firstReport.externalSignals?.inputFiles).toEqual([]);
    expect(firstReport.externalSignals?.accepted).toBe(0);
    expect(firstReport.externalSignals?.rejected).toBe(0);
    expect(firstReport.externalSignals?.digest).toBeNull();
    expect(firstReport.externalSignals?.policy).toBe("v1-conservative-high-30d-route-issue");
    const firstActions = JSON.stringify(firstReport.actions);

    const exitCodeSecond = await invokeAnalyze(["--contract", "v6", "--dir", outDir, "--artifact-profile", "lean", "--top-actions", "12"]);
    expect(exitCodeSecond).toBe(0);
    const secondReport = JSON.parse(await readFile(resolve(outDir, "analyze.json"), "utf8")) as unknown;
    const secondActions = JSON.stringify((secondReport as { readonly actions: unknown }).actions);
    expect(secondActions).toBe(firstActions);

    await rm(root, { recursive: true, force: true });
  });

  it("includes elapsedMs in compact --json summary output", async () => {
    const root = await mkdtemp(join(tmpdir(), "signaler-analyze-json-summary-"));
    const outDir = await writeBaseArtifacts({
      root,
      suggestions: [
        { id: "sugg-unused-javascript-1", title: "Reduce unused JavaScript", priorityScore: 1200, confidence: "high", estimatedImpact: { timeMs: 800, affectedCombos: 2 } },
      ],
    });
    const logSpy = vi.spyOn(console, "log").mockImplementation(() => {});
    const exitCode = await invokeAnalyze(["--contract", "v6", "--dir", outDir, "--json"]);
    expect(exitCode).toBe(0);
    const payloadRaw = logSpy.mock.calls
      .map((call) => String(call[0] ?? ""))
      .find((line) => line.includes("\"command\":\"analyze\""));
    expect(payloadRaw).toBeDefined();
    const payload = JSON.parse(payloadRaw ?? "{}") as { readonly elapsedMs?: number };
    expect(typeof payload.elapsedMs).toBe("number");
    expect((payload.elapsedMs ?? -1) >= 0).toBe(true);
    logSpy.mockRestore();
    await rm(root, { recursive: true, force: true });
  });

  it("applies filtering, profile cap, and evidence cap in non-strict mode", async () => {
    const root = await mkdtemp(join(tmpdir(), "signaler-analyze-filter-"));
    const outDir = await writeBaseArtifacts({
      root,
      suggestions: [
        { id: "sugg-unused-javascript-1", title: "Reduce unused JavaScript", priorityScore: 1400, confidence: "high", estimatedImpact: { timeMs: 1200, affectedCombos: 2 } },
        { id: "sugg-dup-2", title: "Reduce unused JavaScript", priorityScore: 1300, confidence: "high", estimatedImpact: { timeMs: 800, affectedCombos: 2 } },
        { id: "sugg-zero-3", title: "Zero impact", priorityScore: 999, confidence: "high", estimatedImpact: { timeMs: 0, bytes: 0, affectedCombos: 2 } },
        { id: "sugg-low-4", title: "Low confidence", priorityScore: 950, confidence: "low", estimatedImpact: { timeMs: 500, affectedCombos: 1 } },
        { id: "sugg-no-evidence-5", title: "No evidence", priorityScore: 1100, confidence: "high", estimatedImpact: { timeMs: 500, affectedCombos: 1 }, evidence: [] },
        ...new Array(20).fill(0).map((_, index) => ({
          id: `sugg-extra-${index + 10}`,
          title: `Extra suggestion ${index + 10}`,
          priorityScore: 700 - index,
          confidence: "high" as const,
          estimatedImpact: { timeMs: 200 + index, affectedCombos: 1 },
          evidence: [
            { sourceRelPath: "issues.json", pointer: `/topIssues/${index + 1}` },
            { sourceRelPath: "results.json", pointer: `/results/${index % 3}` },
            { sourceRelPath: "summary.json", pointer: `/meta/${index}` },
          ],
          actionSummary: "Duplicate summary",
        })),
      ],
    });

    const exitCode = await invokeAnalyze(["--contract", "v6", "--dir", outDir, "--artifact-profile", "lean", "--min-confidence", "medium"]);
    expect(exitCode).toBe(0);

    const report = JSON.parse(await readFile(resolve(outDir, "analyze.json"), "utf8")) as {
      readonly actions: readonly { readonly evidence: readonly unknown[] }[];
      readonly summary: {
        readonly droppedZeroImpact: number;
        readonly droppedLowConfidence: number;
        readonly droppedMissingEvidence: number;
        readonly droppedByProfileCap: number;
      };
    };
    expect(report.actions.length).toBeLessThanOrEqual(12);
    expect(report.actions.every((action) => action.evidence.length <= 2)).toBe(true);
    expect(report.summary.droppedZeroImpact).toBeGreaterThanOrEqual(1);
    expect(report.summary.droppedLowConfidence).toBeGreaterThanOrEqual(1);
    expect(report.summary.droppedMissingEvidence).toBeGreaterThanOrEqual(1);
    expect(report.summary.droppedByProfileCap).toBeGreaterThanOrEqual(1);

    await rm(root, { recursive: true, force: true });
  });

  it("returns exit 1 when filters leave zero valid actions", async () => {
    const root = await mkdtemp(join(tmpdir(), "signaler-analyze-empty-"));
    const outDir = await writeBaseArtifacts({
      root,
      suggestions: [
        { id: "sugg-zero-1", title: "Zero", priorityScore: 1000, confidence: "high", estimatedImpact: { timeMs: 0, bytes: 0, affectedCombos: 1 } },
        { id: "sugg-low-2", title: "Low", priorityScore: 900, confidence: "low", estimatedImpact: { timeMs: 100, affectedCombos: 1 } },
      ],
    });
    const exitCode = await invokeAnalyze(["--contract", "v6", "--dir", outDir, "--min-confidence", "high"]);
    expect(exitCode).toBe(1);

    await rm(root, { recursive: true, force: true });
  });

  it("returns exit 1 when --external-signals path is missing", async () => {
    const root = await mkdtemp(join(tmpdir(), "signaler-analyze-external-missing-"));
    const outDir = await writeBaseArtifacts({
      root,
      suggestions: [
        { id: "sugg-unused-javascript-1", title: "Reduce unused JavaScript", priorityScore: 1200, confidence: "high", estimatedImpact: { timeMs: 1000, affectedCombos: 2 } },
      ],
    });
    const missing = resolve(root, "missing-signals.json");
    const exitCode = await invokeAnalyze(["--contract", "v6", "--dir", outDir, "--external-signals", missing]);
    expect(exitCode).toBe(1);
    await rm(root, { recursive: true, force: true });
  });

  it("supports repeatable --external-signals and boosts matched actions deterministically", async () => {
    const root = await mkdtemp(join(tmpdir(), "signaler-analyze-external-boost-"));
    const outDir = await writeBaseArtifacts({
      root,
      suggestions: [
        { id: "sugg-unused-javascript-1", title: "Reduce unused JavaScript", priorityScore: 1000, confidence: "high", estimatedImpact: { timeMs: 1200, affectedCombos: 2 } },
        { id: "sugg-server-response-time-2", title: "Reduce server response times (TTFB)", priorityScore: 1100, confidence: "high", estimatedImpact: { timeMs: 500, affectedCombos: 1 } },
      ],
    });
    const signalsA = await writeExternalSignalsFile({
      root,
      name: "signals-a.json",
      records: [
        { id: "r-1", issueId: "unused-javascript", path: "/", confidence: "high", weight: 0.2 },
      ],
    });
    const signalsB = await writeExternalSignalsFile({
      root,
      name: "signals-b.json",
      records: [
        { id: "r-2", issueId: "unused-javascript", path: "/docs", confidence: "high", weight: 0.2 },
        { id: "r-3", issueId: "unused-javascript", path: "/", confidence: "medium", weight: 0.2 },
      ],
    });

    const firstExit = await invokeAnalyze([
      "--contract",
      "v6",
      "--dir",
      outDir,
      "--artifact-profile",
      "lean",
      "--external-signals",
      signalsA,
      "--external-signals",
      signalsB,
    ]);
    expect(firstExit).toBe(0);
    const firstReport = JSON.parse(await readFile(resolve(outDir, "analyze.json"), "utf8")) as {
      readonly actions: readonly { readonly id: string; readonly priorityScore: number; readonly evidence: readonly unknown[] }[];
      readonly externalSignals?: { readonly accepted: number; readonly rejected: number; readonly digest: string; readonly inputFiles: readonly string[] };
      readonly rankingPolicy: { readonly version: string };
    };
    expect(firstReport.rankingPolicy.version).toBe("v6.2");
    expect(firstReport.externalSignals?.accepted).toBe(2);
    expect(firstReport.externalSignals?.rejected).toBe(1);
    expect(firstReport.externalSignals?.inputFiles.length).toBe(2);
    expect(firstReport.actions[0]?.id).toBe("action-sugg-unused-javascript-1");
    expect(firstReport.actions[0]?.priorityScore).toBe(1691);
    expect(firstReport.actions[0]?.evidence.length).toBeGreaterThanOrEqual(2);
    const firstDigest = firstReport.externalSignals?.digest ?? "";
    expect(firstDigest.length).toBeGreaterThan(0);

    const secondExit = await invokeAnalyze([
      "--contract",
      "v6",
      "--dir",
      outDir,
      "--artifact-profile",
      "lean",
      "--external-signals",
      signalsA,
      "--external-signals",
      signalsB,
    ]);
    expect(secondExit).toBe(0);
    const secondReport = JSON.parse(await readFile(resolve(outDir, "analyze.json"), "utf8")) as {
      readonly actions: readonly { readonly id: string; readonly priorityScore: number }[];
      readonly externalSignals?: { readonly digest: string };
    };
    expect(
      JSON.stringify(secondReport.actions.map((row) => ({ id: row.id, priorityScore: row.priorityScore }))),
    ).toBe(
      JSON.stringify(firstReport.actions.map((row) => ({ id: row.id, priorityScore: row.priorityScore }))),
    );
    expect(secondReport.externalSignals?.digest).toBe(firstDigest);

    await rm(root, { recursive: true, force: true });
  });

  it("uses profile-based default token budget when --token-budget is omitted", async () => {
    const root = await mkdtemp(join(tmpdir(), "signaler-analyze-profile-default-budget-"));
    const outDir = await writeBaseArtifacts({
      root,
      suggestions: [
        { id: "sugg-unused-javascript-1", title: "Reduce unused JavaScript", priorityScore: 1000, confidence: "high", estimatedImpact: { timeMs: 1200, affectedCombos: 2 } },
      ],
    });
    const exitCode = await invokeAnalyze(["--contract", "v6", "--dir", outDir, "--artifact-profile", "standard"]);
    expect(exitCode).toBe(0);
    const report = JSON.parse(await readFile(resolve(outDir, "analyze.json"), "utf8")) as { readonly tokenBudget: number };
    expect(report.tokenBudget).toBe(16000);
    await rm(root, { recursive: true, force: true });
  });
});
