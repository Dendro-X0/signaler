import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { describe, expect, it } from "vitest";
import {
  applyExternalBoostToSuggestions,
  buildDefaultExternalSignalsMetadata,
  evaluateConservativeExternalSignals,
  loadExternalSignalsFromFiles,
  matchAcceptedExternalSignals,
} from "../src/external-signals.js";

describe("external-signals contract and policy", () => {
  it("emits disabled metadata defaults when no external input is enabled", () => {
    const metadata = buildDefaultExternalSignalsMetadata();
    expect(metadata.enabled).toBe(false);
    expect(metadata.inputFiles).toEqual([]);
    expect(metadata.accepted).toBe(0);
    expect(metadata.rejected).toBe(0);
    expect(metadata.digest).toBeNull();
    expect(metadata.policy).toBe("v1-conservative-high-30d-route-issue");
  });

  it("loads valid external files and applies conservative acceptance gates", async () => {
    const root = await mkdtemp(join(tmpdir(), "signaler-external-signals-"));
    const fileA = resolve(root, "signals-a.json");
    const fileB = resolve(root, "signals-b.json");
    await writeFile(
      fileA,
      JSON.stringify(
        {
          schemaVersion: 1,
          adapters: [
            {
              adapterId: "custom",
              collectedAt: "2026-03-10T00:00:00.000Z",
              records: [
                {
                  id: "r-1",
                  target: { issueId: "unused-javascript", path: "/" },
                  confidence: "high",
                  weight: 0.2,
                  evidence: [{ sourceRelPath: "external/custom.json", pointer: "/records/0" }],
                },
                {
                  id: "r-2",
                  target: { issueId: "unused-javascript", path: "/" },
                  confidence: "medium",
                  evidence: [{ sourceRelPath: "external/custom.json", pointer: "/records/1" }],
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
          adapters: [
            {
              adapterId: "psi",
              collectedAt: "2026-01-01T00:00:00.000Z",
              records: [
                {
                  id: "r-3",
                  target: { issueId: "unused-javascript", path: "/" },
                  confidence: "high",
                  evidence: [{ sourceRelPath: "external/psi.json", pointer: "/records/0" }],
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

    const loaded = await loadExternalSignalsFromFiles([fileA, fileB]);
    expect(loaded?.records.length).toBe(3);

    const evaluated = evaluateConservativeExternalSignals({
      loaded,
      knownIssueIds: new Set(["unused-javascript"]),
      knownPaths: new Set(["/"]),
      nowMs: Date.parse("2026-03-19T00:00:00.000Z"),
    });
    expect(evaluated).toBeDefined();
    expect(evaluated?.acceptedRecords.length).toBe(1);
    expect(evaluated?.metadata.accepted).toBe(1);
    expect(evaluated?.metadata.rejected).toBe(2);
    expect(evaluated?.metadata.policy).toBe("v1-conservative-high-30d-route-issue");
    expect(evaluated?.metadata.digest.length).toBeGreaterThan(0);

    await rm(root, { recursive: true, force: true });
  });

  it("fails on malformed external file schema", async () => {
    const root = await mkdtemp(join(tmpdir(), "signaler-external-signals-bad-"));
    const fileA = resolve(root, "signals-bad.json");
    await writeFile(
      fileA,
      JSON.stringify({ schemaVersion: 99, adapters: [] }, null, 2),
      "utf8",
    );
    await expect(loadExternalSignalsFromFiles([fileA])).rejects.toThrow("Invalid external signals file");
    await rm(root, { recursive: true, force: true });
  });
});

describe("external-signals ranking integration helpers", () => {
  it("keeps ranking unchanged when no accepted external signals exist", () => {
    const baseline = [
      {
        id: "sugg-unused-javascript-1",
        title: "Reduce unused JavaScript",
        category: "performance" as const,
        priorityScore: 1000,
        confidence: "high" as const,
        estimatedImpact: { timeMs: 1200, affectedCombos: 2 },
        evidence: [{ sourceRelPath: "issues.json", pointer: "/topIssues/0" }],
        action: { summary: "Split bundles", steps: ["Inspect", "Fix", "Rerun"], effort: "medium" as const },
        modeApplicability: ["throughput", "fidelity"] as const,
      },
    ];
    const boosted = applyExternalBoostToSuggestions({
      suggestions: baseline,
      accepted: [],
    });
    expect(boosted[0]?.priorityScore).toBe(1000);
    expect(boosted[0]?.evidence.length).toBe(1);
  });

  it("applies capped boost and appends evidence for run-style suggestions", () => {
    const boosted = applyExternalBoostToSuggestions({
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
          adapterId: "custom",
          collectedAt: "2026-03-10T00:00:00.000Z",
          collectedAtMs: Date.parse("2026-03-10T00:00:00.000Z"),
          id: "r-1",
          target: { issueId: "unused-javascript", path: "/" },
          weight: 0.2,
          evidence: [{ sourceRelPath: "external/custom.json", pointer: "/records/0" }],
        },
        {
          adapterId: "psi",
          collectedAt: "2026-03-11T00:00:00.000Z",
          collectedAtMs: Date.parse("2026-03-11T00:00:00.000Z"),
          id: "r-2",
          target: { issueId: "unused-javascript", path: "/docs" },
          weight: 0.2,
          evidence: [{ sourceRelPath: "external/psi.json", pointer: "/records/0" }],
        },
      ],
    });

    expect(boosted[0]?.id).toBe("sugg-unused-javascript-1");
    expect(boosted[0]?.priorityScore).toBe(1300);
    expect(boosted[0]?.evidence.length).toBe(3);
    expect(boosted[1]?.priorityScore).toBe(1100);
  });

  it("supports path-scoped matching for analyze-style action routing", () => {
    const matched = matchAcceptedExternalSignals({
      accepted: [
        {
          adapterId: "custom",
          collectedAt: "2026-03-10T00:00:00.000Z",
          collectedAtMs: Date.parse("2026-03-10T00:00:00.000Z"),
          id: "r-1",
          target: { issueId: "unused-javascript", path: "/" },
          weight: 0.15,
          evidence: [{ sourceRelPath: "external/custom.json", pointer: "/records/0" }],
        },
        {
          adapterId: "custom",
          collectedAt: "2026-03-10T00:00:00.000Z",
          collectedAtMs: Date.parse("2026-03-10T00:00:00.000Z"),
          id: "r-2",
          target: { issueId: "unused-javascript", path: "/blog" },
          weight: 0.15,
          evidence: [{ sourceRelPath: "external/custom.json", pointer: "/records/1" }],
        },
      ],
      issueId: "unused-javascript",
      allowedPaths: ["/"],
    });

    expect(matched.totalBoost).toBe(0.15);
    expect(matched.evidence.length).toBe(1);
  });
});
