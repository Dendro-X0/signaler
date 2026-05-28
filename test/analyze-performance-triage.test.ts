import { describe, expect, it } from "vitest";
import {
  buildCandidateDraftsFromPerformanceTriage,
  mergeAnalyzeCandidateDrafts,
} from "../src/analyze-performance-triage.js";
import type { PerformanceTriageV3 } from "../src/contracts/v3/performance-triage-v3.js";
import type { ResultsV3Line } from "../src/contracts/v3/results-v3.js";

const triageFixture: PerformanceTriageV3 = {
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
};

const results: ResultsV3Line[] = [
  {
    label: "Home",
    path: "/",
    url: "http://127.0.0.1:3000/",
    device: "mobile",
    scores: { performance: 45 },
    metrics: { lcpMs: 2900 },
    opportunities: [{ id: "unused-javascript", title: "Reduce unused JavaScript", estimatedSavingsMs: 900 }],
    failedAudits: [],
  },
];

describe("analyze-performance-triage", () => {
  it("builds performance candidates with issue-count verify direction", () => {
    const drafts = buildCandidateDraftsFromPerformanceTriage({ triage: triageFixture, results });
    expect(drafts).toHaveLength(1);
    expect(drafts[0]?.category).toBe("performance");
    expect(drafts[0]?.verifyPlan.expectedDirection.issueCount).toBe("down");
    expect(drafts[0]?.verifyPlan.expectedDirection.score).toBeUndefined();
  });

  it("maps non-performance lighthouse audits to the right analyze category", () => {
    const drafts = buildCandidateDraftsFromPerformanceTriage({
      triage: {
        ...triageFixture,
        uniqueIssues: [
          {
            id: "document-title",
            title: "Document doesn't have a `<title>` element",
            severity: "red",
            kind: "audit",
            affectedCombos: 1,
            pointer: "performance-triage.json#/uniqueIssues/0",
          },
          {
            id: "landmark-one-main",
            title: "Document does not have a main landmark.",
            severity: "red",
            kind: "audit",
            affectedCombos: 1,
            pointer: "performance-triage.json#/uniqueIssues/1",
          },
        ],
      },
      results: [
        {
          ...results[0]!,
          failedAudits: [
            { id: "document-title", title: "Document doesn't have a `<title>` element", score: 0, scoreDisplayMode: "binary" },
            { id: "landmark-one-main", title: "Document does not have a main landmark.", score: 0, scoreDisplayMode: "binary" },
          ],
        },
      ],
    });
    expect(drafts.find((draft) => draft.sourceSuggestionId === "triage-document-title")?.category).toBe("seo");
    expect(drafts.find((draft) => draft.sourceSuggestionId === "triage-landmark-one-main")?.category).toBe("accessibility");
  });

  it("merges triage and suggestion drafts by issue id", () => {
    const triageDrafts = buildCandidateDraftsFromPerformanceTriage({ triage: triageFixture, results });
    const suggestionDrafts = [
      {
        ...triageDrafts[0]!,
        sourceSuggestionId: "sugg-unused-javascript-1",
        fromPerformanceTriage: undefined,
        basePriority: 500,
      },
    ];
    const merged = mergeAnalyzeCandidateDrafts({ triageDrafts, suggestionDrafts });
    expect(merged).toHaveLength(1);
    expect(merged[0]?.basePriority).toBeGreaterThan(500);
    expect(merged[0]?.fromPerformanceTriage).toBe(true);
  });
});
