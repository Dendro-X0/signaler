import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { describe, expect, it } from "vitest";
import {
  applyBenchmarkBoostToSuggestions,
  buildDefaultMultiBenchmarkMetadata,
  evaluateConservativeMultiBenchmarkSignals,
  loadMultiBenchmarkSignalsFromFiles,
  matchAcceptedMultiBenchmarkSignals,
} from "../src/multi-benchmark-signals.js";

describe("multi-benchmark-signals contract and policy", () => {
  it("emits disabled metadata defaults when benchmark input is not enabled", () => {
    const metadata = buildDefaultMultiBenchmarkMetadata();
    expect(metadata.enabled).toBe(false);
    expect(metadata.inputFiles).toEqual([]);
    expect(metadata.sources).toEqual([]);
    expect(metadata.accepted).toBe(0);
    expect(metadata.rejected).toBe(0);
    expect(metadata.digest).toBeNull();
    expect(metadata.policy).toBe("v1-conservative-high-30d-route-issue");
    expect(metadata.rankingVersion).toBe("j3-composite-ranking");
  });

  it("loads valid benchmark files and applies conservative acceptance gates", async () => {
    const root = await mkdtemp(join(tmpdir(), "signaler-benchmark-signals-"));
    const fileA = resolve(root, "benchmark-a.json");
    const fileB = resolve(root, "benchmark-b.json");

    await writeFile(
      fileA,
      JSON.stringify(
        {
          schemaVersion: 1,
          sources: [
            {
              sourceId: "accessibility-extended",
              collectedAt: "2026-03-10T00:00:00.000Z",
              records: [
                {
                  id: "a-1",
                  target: { issueId: "unused-javascript", path: "/" },
                  confidence: "high",
                  evidence: [{ sourceRelPath: "bench/a11y.json", pointer: "/sources/0/records/0" }],
                  metrics: {
                    wcagViolationCount: 4,
                    seriousViolationCount: 2,
                    focusAppearanceIssueCount: 1,
                    focusNotObscuredIssueCount: 1,
                    targetSizeIssueCount: 2,
                    draggingAlternativeIssueCount: 1,
                    apgPatternMismatchCount: 2,
                    keyboardSupportIssueCount: 1,
                  },
                },
                {
                  id: "a-2",
                  target: { issueId: "unused-javascript", path: "/" },
                  confidence: "medium",
                  evidence: [{ sourceRelPath: "bench/a11y.json", pointer: "/sources/0/records/1" }],
                },
              ],
            },
            {
              sourceId: "seo-technical",
              collectedAt: "2026-03-12T00:00:00.000Z",
              records: [
                {
                  id: "s-1",
                  target: { issueId: "server-response-time", path: "/missing" },
                  confidence: "high",
                  evidence: [{ sourceRelPath: "bench/seo.json", pointer: "/sources/1/records/0" }],
                  metrics: { indexabilityIssueCount: 1, structuredDataErrorCount: 3 },
                },
              ],
            },
          ],
        },
        null,
        2,
      ),
      "utf8",
    );

    await writeFile(
      fileB,
      JSON.stringify(
        {
          schemaVersion: 1,
          sources: [
            {
              sourceId: "security-baseline",
              collectedAt: "2026-01-01T00:00:00.000Z",
              records: [
                {
                  id: "sec-1",
                  target: { issueId: "unused-javascript", path: "/" },
                  confidence: "high",
                  evidence: [{ sourceRelPath: "bench/sec.json", pointer: "/sources/0/records/0" }],
                  metrics: { missingHeaderCount: 2 },
                },
              ],
            },
            {
              sourceId: "reliability-slo",
              collectedAt: "2026-03-10T00:00:00.000Z",
              records: [
                {
                  id: "rel-1",
                  target: { issueId: "server-response-time", path: "/docs" },
                  confidence: "high",
                  evidence: [{ sourceRelPath: "bench/reliability.json", pointer: "/sources/1/records/0" }],
                  metrics: { availabilityPct: 99.2, errorRatePct: 0.4, latencyP95Ms: 850 },
                },
              ],
            },
            {
              sourceId: "cross-browser-parity",
              collectedAt: "2026-03-10T00:00:00.000Z",
              records: [
                {
                  id: "parity-1",
                  target: { issueId: "unused-javascript", path: "/" },
                  confidence: "high",
                  evidence: [{ sourceRelPath: "bench/parity.json", pointer: "/sources/2/records/0" }],
                  metrics: { scoreVariancePct: 5.2, lcpDeltaMs: 280, clsDelta: 0.03 },
                },
              ],
            },
          ],
        },
        null,
        2,
      ),
      "utf8",
    );

    const loaded = await loadMultiBenchmarkSignalsFromFiles([fileA, fileB]);
    expect(loaded?.records.length).toBe(6);
    expect(loaded?.sourceIds).toEqual([
      "accessibility-extended",
      "cross-browser-parity",
      "reliability-slo",
      "security-baseline",
      "seo-technical",
    ]);

    const evaluated = evaluateConservativeMultiBenchmarkSignals({
      loaded,
      knownIssueIds: new Set(["unused-javascript", "server-response-time"]),
      knownPaths: new Set(["/", "/docs"]),
      nowMs: Date.parse("2026-03-19T00:00:00.000Z"),
    });
    expect(evaluated).toBeDefined();
    expect(evaluated?.acceptedRecords.length).toBe(3);
    expect(evaluated?.metadata.accepted).toBe(3);
    expect(evaluated?.metadata.rejected).toBe(3);
    expect(evaluated?.metadata.sources).toEqual([
      "accessibility-extended",
      "cross-browser-parity",
      "reliability-slo",
      "security-baseline",
      "seo-technical",
    ]);
    expect(evaluated?.metadata.digest.length).toBeGreaterThan(0);
    expect(evaluated?.metadata.rankingVersion).toBe("j3-composite-ranking");
    const accessibilityAccepted = evaluated?.acceptedRecords.find((record) => record.id === "a-1");
    expect(accessibilityAccepted?.metrics).toMatchObject({
      focusAppearanceIssueCount: 1,
      focusNotObscuredIssueCount: 1,
      targetSizeIssueCount: 2,
      draggingAlternativeIssueCount: 1,
      apgPatternMismatchCount: 2,
      keyboardSupportIssueCount: 1,
    });

    await rm(root, { recursive: true, force: true });
  });

  it("accepts WCAG 2.2 and APG-aligned accessibility metric fields", async () => {
    const root = await mkdtemp(join(tmpdir(), "signaler-benchmark-signals-a11y-"));
    const fileA = resolve(root, "benchmark-a11y.json");
    await writeFile(
      fileA,
      JSON.stringify(
        {
          schemaVersion: 1,
          sources: [
            {
              sourceId: "accessibility-extended",
              collectedAt: "2026-03-12T00:00:00.000Z",
              records: [
                {
                  id: "a11y-wcag22-1",
                  target: { issueId: "unused-javascript", path: "/" },
                  confidence: "high",
                  evidence: [{ sourceRelPath: "bench/a11y.json", pointer: "/sources/0/records/0" }],
                  metrics: {
                    focusAppearanceIssueCount: 3,
                    focusNotObscuredIssueCount: 2,
                    targetSizeIssueCount: 4,
                    draggingAlternativeIssueCount: 1,
                    apgPatternMismatchCount: 5,
                    keyboardSupportIssueCount: 2,
                  },
                },
              ],
            },
          ],
        },
        null,
        2,
      ),
      "utf8",
    );

    const loaded = await loadMultiBenchmarkSignalsFromFiles([fileA]);
    expect(loaded?.records.length).toBe(1);
    expect(loaded?.records[0]?.metrics).toMatchObject({
      focusAppearanceIssueCount: 3,
      focusNotObscuredIssueCount: 2,
      targetSizeIssueCount: 4,
      draggingAlternativeIssueCount: 1,
      apgPatternMismatchCount: 5,
      keyboardSupportIssueCount: 2,
    });

    await rm(root, { recursive: true, force: true });
  });

  it("fails on malformed benchmark file schema", async () => {
    const root = await mkdtemp(join(tmpdir(), "signaler-benchmark-signals-bad-"));
    const fileA = resolve(root, "benchmark-bad.json");
    await writeFile(
      fileA,
      JSON.stringify({ schemaVersion: 99, sources: [] }, null, 2),
      "utf8",
    );
    await expect(loadMultiBenchmarkSignalsFromFiles([fileA])).rejects.toThrow("Invalid benchmark signals file");
    await rm(root, { recursive: true, force: true });
  });

  it("produces deterministic digest for identical accepted benchmark records", async () => {
    const root = await mkdtemp(join(tmpdir(), "signaler-benchmark-signals-digest-"));
    const fileA = resolve(root, "benchmark-a.json");
    const fileB = resolve(root, "benchmark-b.json");
    await writeFile(
      fileA,
      JSON.stringify(
        {
          schemaVersion: 1,
          sources: [
            {
              sourceId: "accessibility-extended",
              collectedAt: "2026-03-10T00:00:00.000Z",
              records: [
                {
                  id: "a-1",
                  target: { issueId: "unused-javascript", path: "/" },
                  confidence: "high",
                  evidence: [{ sourceRelPath: "bench/a11y.json", pointer: "/sources/0/records/0" }],
                },
              ],
            },
          ],
        },
        null,
        2,
      ),
      "utf8",
    );
    await writeFile(
      fileB,
      JSON.stringify(
        {
          schemaVersion: 1,
          sources: [
            {
              sourceId: "seo-technical",
              collectedAt: "2026-03-11T00:00:00.000Z",
              records: [
                {
                  id: "s-1",
                  target: { issueId: "server-response-time", path: "/docs" },
                  confidence: "high",
                  evidence: [{ sourceRelPath: "bench/seo.json", pointer: "/sources/0/records/0" }],
                },
              ],
            },
          ],
        },
        null,
        2,
      ),
      "utf8",
    );

    const first = evaluateConservativeMultiBenchmarkSignals({
      loaded: await loadMultiBenchmarkSignalsFromFiles([fileA, fileB]),
      knownIssueIds: new Set(["unused-javascript", "server-response-time"]),
      knownPaths: new Set(["/", "/docs"]),
      nowMs: Date.parse("2026-03-19T00:00:00.000Z"),
    });
    const second = evaluateConservativeMultiBenchmarkSignals({
      loaded: await loadMultiBenchmarkSignalsFromFiles([fileB, fileA]),
      knownIssueIds: new Set(["unused-javascript", "server-response-time"]),
      knownPaths: new Set(["/", "/docs"]),
      nowMs: Date.parse("2026-03-19T00:00:00.000Z"),
    });
    expect(first?.metadata.accepted).toBe(2);
    expect(second?.metadata.accepted).toBe(2);
    expect(first?.metadata.digest).toBe(second?.metadata.digest);

    await rm(root, { recursive: true, force: true });
  });
});

describe("multi-benchmark ranking helpers", () => {
  it("matches by issue/path and applies per-source + total boost caps", () => {
    const matched = matchAcceptedMultiBenchmarkSignals({
      accepted: [
        {
          sourceId: "reliability-slo",
          collectedAt: "2026-03-10T00:00:00.000Z",
          collectedAtMs: Date.parse("2026-03-10T00:00:00.000Z"),
          id: "r-1",
          target: { issueId: "unused-javascript", path: "/" },
          confidence: "high",
          evidence: [{ sourceRelPath: "bench/reliability.json", pointer: "/records/0" }],
        },
        {
          sourceId: "reliability-slo",
          collectedAt: "2026-03-10T00:00:00.000Z",
          collectedAtMs: Date.parse("2026-03-10T00:00:00.000Z"),
          id: "r-2",
          target: { issueId: "unused-javascript", path: "/" },
          confidence: "high",
          evidence: [{ sourceRelPath: "bench/reliability.json", pointer: "/records/1" }],
        },
        {
          sourceId: "accessibility-extended",
          collectedAt: "2026-03-10T00:00:00.000Z",
          collectedAtMs: Date.parse("2026-03-10T00:00:00.000Z"),
          id: "a-1",
          target: { issueId: "unused-javascript", path: "/" },
          confidence: "high",
          evidence: [{ sourceRelPath: "bench/a11y.json", pointer: "/records/0" }],
        },
        {
          sourceId: "seo-technical",
          collectedAt: "2026-03-10T00:00:00.000Z",
          collectedAtMs: Date.parse("2026-03-10T00:00:00.000Z"),
          id: "s-1",
          target: { issueId: "unused-javascript", path: "/docs" },
          confidence: "high",
          evidence: [{ sourceRelPath: "bench/seo.json", pointer: "/records/0" }],
        },
      ],
      issueId: "unused-javascript",
      allowedPaths: ["/"],
    });

    expect(matched.sourceBoosts["reliability-slo"]).toBe(0.12);
    expect(matched.sourceBoosts["accessibility-extended"]).toBe(0.06);
    expect(matched.sourceBoosts["seo-technical"]).toBe(0);
    expect(matched.totalBoost).toBe(0.18);
    expect(matched.evidence.length).toBe(3);
  });

  it("applies bounded benchmark boost to run-style suggestions and appends evidence", () => {
    const boosted = applyBenchmarkBoostToSuggestions({
      suggestions: [
        {
          id: "sugg-unused-javascript-1",
          title: "Reduce unused JavaScript",
          category: "performance",
          priorityScore: 1000,
          confidence: "high",
          estimatedImpact: { timeMs: 1200, affectedCombos: 2 },
          evidence: [{ sourceRelPath: "issues.json", pointer: "/topIssues/0" }],
          action: { summary: "Split bundles", steps: ["Inspect", "Fix", "Rerun"], effort: "medium" },
          modeApplicability: ["throughput", "fidelity"],
        },
        {
          id: "sugg-redirects-2",
          title: "Avoid redirects",
          category: "performance",
          priorityScore: 1100,
          confidence: "high",
          estimatedImpact: { timeMs: 500, affectedCombos: 1 },
          evidence: [{ sourceRelPath: "issues.json", pointer: "/topIssues/1" }],
          action: { summary: "Remove redirect chains", steps: ["Inspect", "Fix", "Rerun"], effort: "medium" },
          modeApplicability: ["throughput", "fidelity"],
        },
      ],
      accepted: [
        {
          sourceId: "reliability-slo",
          collectedAt: "2026-03-10T00:00:00.000Z",
          collectedAtMs: Date.parse("2026-03-10T00:00:00.000Z"),
          id: "r-1",
          target: { issueId: "unused-javascript", path: "/" },
          confidence: "high",
          evidence: [{ sourceRelPath: "bench/reliability.json", pointer: "/records/0" }],
        },
        {
          sourceId: "accessibility-extended",
          collectedAt: "2026-03-10T00:00:00.000Z",
          collectedAtMs: Date.parse("2026-03-10T00:00:00.000Z"),
          id: "a-1",
          target: { issueId: "unused-javascript", path: "/docs" },
          confidence: "high",
          evidence: [{ sourceRelPath: "bench/a11y.json", pointer: "/records/1" }],
        },
      ],
    });

    expect(boosted[0]?.id).toBe("sugg-unused-javascript-1");
    expect(boosted[0]?.priorityScore).toBe(1130);
    expect(boosted[0]?.evidence.length).toBe(3);
    expect(boosted[1]?.priorityScore).toBe(1100);
  });
});
