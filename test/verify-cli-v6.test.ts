import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { isVerifyReportV6 } from "../src/contracts/v6/validators.js";

type MockRerunState = {
  readonly comparabilityHash: string;
  readonly performanceAfter: number;
  readonly includeResults: boolean;
};

let mockRerunState: MockRerunState = {
  comparabilityHash: "base-hash",
  performanceAfter: 62,
  includeResults: true,
};

vi.mock("../src/cli.js", () => ({
  runAuditCli: vi.fn(),
}));

import { runAuditCli } from "../src/cli.js";
import { runVerifyCli } from "../src/verify-cli.js";

const runAuditCliMock = vi.mocked(runAuditCli);

async function invokeVerify(args: readonly string[]): Promise<number> {
  process.exitCode = 0;
  await runVerifyCli(["node", "signaler", ...args]);
  return process.exitCode ?? 0;
}

async function createBaselineFixture(root: string): Promise<{ readonly dir: string; readonly analyzePath: string }> {
  const outDir = resolve(root, ".signaler");
  await mkdir(outDir, { recursive: true });

  const configPath = resolve(root, "signaler.config.json");
  await writeFile(
    configPath,
    JSON.stringify(
      {
        baseUrl: "http://127.0.0.1:3000",
        pages: [
          { path: "/", label: "Home", devices: ["mobile", "desktop"] },
          { path: "/docs", label: "Docs", devices: ["mobile"] },
        ],
      },
      null,
      2,
    ),
    "utf8",
  );

  await writeFile(
    resolve(outDir, "run.json"),
    JSON.stringify(
      {
        protocol: {
          mode: "throughput",
          comparabilityHash: "base-hash",
        },
        meta: {
          configPath,
          averageStepMs: 12000,
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
            scores: { performance: 60, accessibility: 95, bestPractices: 92, seo: 94 },
            metrics: { lcpMs: 2500, tbtMs: 200, cls: 0.05 },
            opportunities: [{ id: "unused-javascript", title: "Reduce unused JavaScript", estimatedSavingsMs: 900, estimatedSavingsBytes: 50000 }],
            failedAudits: [],
          },
          {
            label: "Docs",
            path: "/docs",
            url: "http://127.0.0.1:3000/docs",
            device: "mobile",
            scores: { performance: 58, accessibility: 95, bestPractices: 92, seo: 94 },
            metrics: { lcpMs: 2600, tbtMs: 210, cls: 0.06 },
            opportunities: [{ id: "server-response-time", title: "Reduce server response times (TTFB)", estimatedSavingsMs: 300, estimatedSavingsBytes: 1000 }],
            failedAudits: [],
          },
        ],
      },
      null,
      2,
    ),
    "utf8",
  );

  const analyzePath = resolve(outDir, "analyze.json");
  await writeFile(
    analyzePath,
    JSON.stringify(
      {
        schemaVersion: 1,
        generatedAt: new Date().toISOString(),
        source: {
          dir: ".signaler",
          runComparabilityHash: "base-hash",
          runMode: "throughput",
          runProfile: "throughput-balanced",
        },
        artifactProfile: "lean",
        tokenBudget: 8000,
        rankingPolicy: {
          version: "v6.1",
          formula: "priority = round(basePriority * confidenceWeight * coverageWeight)",
          confidenceWeights: { high: 1.0, medium: 0.7, low: 0.4 },
        },
        actions: [
          {
            id: "action-a",
            sourceSuggestionId: "sugg-unused-javascript-1",
            title: "Reduce unused JavaScript",
            category: "performance",
            priorityScore: 1200,
            confidence: "high",
            estimatedImpact: { timeMs: 900, bytes: 50000, affectedCombos: 1 },
            affectedCombos: [{ label: "Home", path: "/", device: "mobile" }],
            evidence: [{ sourceRelPath: "issues.json", pointer: "/topIssues/0" }],
            action: { summary: "Split route bundles.", steps: ["Inspect", "Fix", "Rerun"], effort: "medium" },
            verifyPlan: {
              recommendedMode: "fidelity",
              targetRoutes: ["/", "/docs"],
              expectedDirection: { score: "up", lcpMs: "down", tbtMs: "down", cls: "down", bytes: "down" },
            },
          },
          {
            id: "action-b",
            sourceSuggestionId: "sugg-server-response-time-2",
            title: "Reduce server response times (TTFB)",
            category: "performance",
            priorityScore: 800,
            confidence: "medium",
            estimatedImpact: { timeMs: 300, affectedCombos: 1 },
            affectedCombos: [{ label: "Docs", path: "/docs", device: "mobile" }],
            evidence: [{ sourceRelPath: "issues.json", pointer: "/topIssues/1" }],
            action: { summary: "Improve server response.", steps: ["Inspect", "Optimize"], effort: "medium" },
            verifyPlan: {
              recommendedMode: "fidelity",
              targetRoutes: ["/docs", "/"],
              expectedDirection: { score: "up" },
            },
          },
        ],
        summary: {
          totalCandidates: 2,
          emittedActions: 2,
          droppedZeroImpact: 0,
          droppedLowConfidence: 0,
          droppedMissingEvidence: 0,
          droppedDuplicate: 0,
          droppedByProfileCap: 0,
          droppedByTopActions: 0,
          droppedByTokenBudget: 0,
          estimatedTokens: 500,
          warnings: [],
        },
      },
      null,
      2,
    ),
    "utf8",
  );

  return { dir: outDir, analyzePath };
}

describe("verify-cli v6", () => {
  beforeEach(() => {
    mockRerunState = {
      comparabilityHash: "base-hash",
      performanceAfter: 62,
      includeResults: true,
    };
    runAuditCliMock.mockReset();
    runAuditCliMock.mockImplementation(async (argv: readonly string[]) => {
      const resolveArg = (flag: string): string | undefined => {
        const idx = argv.findIndex((value) => value === flag);
        if (idx >= 0 && idx + 1 < argv.length) {
          return argv[idx + 1];
        }
        return undefined;
      };
      const outputDir = resolve(resolveArg("--dir") ?? ".signaler");
      const configPath = resolveArg("--config") ?? "signaler.config.json";
      await mkdir(outputDir, { recursive: true });
      await writeFile(
        resolve(outputDir, "run.json"),
        JSON.stringify(
          {
            protocol: {
              mode: "fidelity",
              comparabilityHash: mockRerunState.comparabilityHash,
            },
            meta: {
              configPath,
            },
          },
          null,
          2,
        ),
        "utf8",
      );
      await writeFile(
        resolve(outputDir, "results.json"),
        JSON.stringify(
          {
            generatedAt: new Date().toISOString(),
            results: mockRerunState.includeResults
              ? [
                {
                  label: "Home",
                  path: "/",
                  url: "http://127.0.0.1:3000/",
                  device: "mobile",
                  scores: { performance: mockRerunState.performanceAfter, accessibility: 95, bestPractices: 92, seo: 94 },
                  metrics: { lcpMs: 2100, tbtMs: 140, cls: 0.03 },
                  opportunities: [{ id: "unused-javascript", title: "Reduce unused JavaScript", estimatedSavingsMs: 500, estimatedSavingsBytes: 40000 }],
                  failedAudits: [],
                },
              ]
              : [],
          },
          null,
          2,
        ),
        "utf8",
      );
    });
  });

  it("fails cleanly when required baseline/analyze artifacts are missing", async () => {
    const root = await mkdtemp(join(tmpdir(), "signaler-verify-missing-"));
    const exitCode = await invokeVerify(["--contract", "v6", "--dir", resolve(root, ".signaler")]);
    expect(exitCode).toBe(1);
    await rm(root, { recursive: true, force: true });
  });

  it("fails when thresholds file schema is invalid", async () => {
    const root = await mkdtemp(join(tmpdir(), "signaler-verify-thresholds-"));
    const fixture = await createBaselineFixture(root);
    const thresholdsPath = resolve(root, "thresholds.json");
    await writeFile(thresholdsPath, JSON.stringify({ minScoreDelta: "bad" }, null, 2), "utf8");
    const exitCode = await invokeVerify(["--contract", "v6", "--dir", fixture.dir, "--from", fixture.analyzePath, "--pass-thresholds", thresholdsPath]);
    expect(exitCode).toBe(1);
    await rm(root, { recursive: true, force: true });
  });

  it("supports dry-run, writes artifacts, and exits with code 3", async () => {
    const root = await mkdtemp(join(tmpdir(), "signaler-verify-dry-"));
    const fixture = await createBaselineFixture(root);
    const exitCode = await invokeVerify(["--contract", "v6", "--dir", fixture.dir, "--from", fixture.analyzePath, "--dry-run"]);
    expect(exitCode).toBe(3);
    const report = JSON.parse(await readFile(resolve(fixture.dir, "verify.json"), "utf8")) as unknown;
    expect(isVerifyReportV6(report)).toBe(true);
    const rerunDir = (report as { readonly rerun: { readonly dir: string } }).rerun.dir;
    const verifyConfigPath = resolve(rerunDir, "verify.config.json");
    expect(await readFile(verifyConfigPath, "utf8")).toContain("\"pages\"");
    await rm(root, { recursive: true, force: true });
  });

  it("honors action-id precedence and deterministic route capping", async () => {
    const root = await mkdtemp(join(tmpdir(), "signaler-verify-routes-"));
    const fixture = await createBaselineFixture(root);
    const exitCode = await invokeVerify([
      "--contract", "v6",
      "--dir", fixture.dir,
      "--from", fixture.analyzePath,
      "--action-ids", "action-b,action-a",
      "--max-routes", "1",
      "--dry-run",
    ]);
    expect(exitCode).toBe(3);
    const report = JSON.parse(await readFile(resolve(fixture.dir, "verify.json"), "utf8")) as {
      readonly checks: readonly { readonly actionId: string }[];
      readonly rerun: { readonly dir: string };
    };
    expect(report.checks[0]?.actionId).toBe("action-b");
    const verifyConfig = JSON.parse(await readFile(resolve(report.rerun.dir, "verify.config.json"), "utf8")) as {
      readonly pages: readonly { readonly path: string }[];
    };
    expect(verifyConfig.pages.length).toBe(1);
    expect(verifyConfig.pages[0]?.path).toBe("/docs");
    await rm(root, { recursive: true, force: true });
  });

  it("trims routes deterministically with --runtime-budget-ms and reports planning JSON in dry-run mode", async () => {
    const root = await mkdtemp(join(tmpdir(), "signaler-verify-budgeted-"));
    const fixture = await createBaselineFixture(root);
    const logSpy = vi.spyOn(console, "log").mockImplementation(() => {});
    const exitCode = await invokeVerify([
      "--contract", "v6",
      "--dir", fixture.dir,
      "--from", fixture.analyzePath,
      "--action-ids", "action-b,action-a",
      "--max-routes", "2",
      "--runtime-budget-ms", "15000",
      "--dry-run",
      "--json",
    ]);
    expect(exitCode).toBe(3);

    const payloadRaw = logSpy.mock.calls
      .map((call) => String(call[0] ?? ""))
      .find((line) => line.includes("\"command\":\"verify\""));
    expect(payloadRaw).toBeDefined();
    const payload = JSON.parse(payloadRaw ?? "{}") as {
      readonly selectedActionIds: readonly string[];
      readonly candidateRoutes: readonly string[];
      readonly selectedRoutes: readonly string[];
      readonly estimatedRuntimeMs: number;
      readonly runtimeBudgetMs: number;
      readonly plannedCombos: number;
      readonly executedCombos: number;
      readonly elapsedMs: number;
    };
    expect(payload.selectedActionIds).toEqual(["action-b", "action-a"]);
    expect(payload.candidateRoutes).toEqual(["/docs", "/"]);
    expect(payload.selectedRoutes).toEqual(["/docs"]);
    expect(payload.runtimeBudgetMs).toBe(15000);
    expect(payload.estimatedRuntimeMs).toBe(12000);
    expect(payload.plannedCombos).toBe(1);
    expect(payload.executedCombos).toBe(0);
    expect(payload.elapsedMs).toBeGreaterThanOrEqual(0);
    logSpy.mockRestore();
    await rm(root, { recursive: true, force: true });
  });

  it("applies threshold overrides to pass/fail outcomes", async () => {
    const root = await mkdtemp(join(tmpdir(), "signaler-verify-threshold-override-"));
    const fixture = await createBaselineFixture(root);

    const passExit = await invokeVerify(["--contract", "v6", "--dir", fixture.dir, "--from", fixture.analyzePath, "--action-ids", "action-a"]);
    expect(passExit).toBe(0);

    const strictThresholdPath = resolve(root, "strict-thresholds.json");
    await writeFile(
      strictThresholdPath,
      JSON.stringify(
        {
          minScoreDelta: 5,
          minLcpDeltaMs: 1000,
          minTbtDeltaMs: 1000,
          minClsDelta: 1,
          minBytesDelta: 1000000,
        },
        null,
        2,
      ),
      "utf8",
    );
    const failExit = await invokeVerify([
      "--contract", "v6",
      "--dir", fixture.dir,
      "--from", fixture.analyzePath,
      "--action-ids", "action-a",
      "--pass-thresholds", strictThresholdPath,
    ]);
    expect(failExit).toBe(2);
    await rm(root, { recursive: true, force: true });
  });

  it("warns and continues when comparability mismatches by default", async () => {
    const root = await mkdtemp(join(tmpdir(), "signaler-verify-compare-warn-"));
    const fixture = await createBaselineFixture(root);
    mockRerunState = { ...mockRerunState, comparabilityHash: "rerun-hash" };
    const exitCode = await invokeVerify(["--contract", "v6", "--dir", fixture.dir, "--from", fixture.analyzePath, "--action-ids", "action-a"]);
    expect(exitCode).toBe(0);
    const report = JSON.parse(await readFile(resolve(fixture.dir, "verify.json"), "utf8")) as {
      readonly comparability: { readonly matched: boolean };
      readonly summary: { readonly warnings: readonly string[] };
    };
    expect(report.comparability.matched).toBe(false);
    expect(report.summary.warnings.some((warning) => warning.includes("Comparability mismatch"))).toBe(true);
    await rm(root, { recursive: true, force: true });
  });

  it("fails with strict comparability on mismatch", async () => {
    const root = await mkdtemp(join(tmpdir(), "signaler-verify-compare-strict-"));
    const fixture = await createBaselineFixture(root);
    mockRerunState = { ...mockRerunState, comparabilityHash: "rerun-hash" };
    const exitCode = await invokeVerify([
      "--contract", "v6",
      "--dir", fixture.dir,
      "--from", fixture.analyzePath,
      "--action-ids", "action-a",
      "--strict-comparability",
    ]);
    expect(exitCode).toBe(1);
    await rm(root, { recursive: true, force: true });
  });

  it("continues when strict+allow flags are both set on mismatch", async () => {
    const root = await mkdtemp(join(tmpdir(), "signaler-verify-compare-allow-"));
    const fixture = await createBaselineFixture(root);
    mockRerunState = { ...mockRerunState, comparabilityHash: "rerun-hash" };
    const exitCode = await invokeVerify([
      "--contract", "v6",
      "--dir", fixture.dir,
      "--from", fixture.analyzePath,
      "--action-ids", "action-a",
      "--strict-comparability",
      "--allow-comparability-mismatch",
    ]);
    expect(exitCode).toBe(0);
    await rm(root, { recursive: true, force: true });
  });

  it("marks checks as skipped when comparable combo data is missing", async () => {
    const root = await mkdtemp(join(tmpdir(), "signaler-verify-skipped-"));
    const fixture = await createBaselineFixture(root);
    mockRerunState = { ...mockRerunState, includeResults: false };
    const exitCode = await invokeVerify(["--contract", "v6", "--dir", fixture.dir, "--from", fixture.analyzePath, "--action-ids", "action-a"]);
    expect(exitCode).toBe(0);
    const report = JSON.parse(await readFile(resolve(fixture.dir, "verify.json"), "utf8")) as {
      readonly summary: { readonly skipped: number; readonly failed: number };
    };
    expect(report.summary.skipped).toBeGreaterThan(0);
    expect(report.summary.failed).toBe(0);
    await rm(root, { recursive: true, force: true });
  });
});
