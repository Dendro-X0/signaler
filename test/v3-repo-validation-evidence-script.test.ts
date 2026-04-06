import { describe, expect, it } from "vitest";
import {
  improvementDelta,
  isPublicRepoUrl,
  parseArgs,
  qualifies,
  summarize,
  type RepoValidationEvidence,
  type RepoValidationEntry,
} from "../scripts/v3-repo-validation-evidence.js";

describe("v3 repo validation evidence script", () => {
  it("parses list command", () => {
    const parsed = parseArgs(["list"]);
    expect(parsed.command).toBe("list");
    expect(parsed.filePath.toLowerCase()).toContain("release");
    expect(parsed.filePath.toLowerCase()).toContain("repo-validation-evidence.json");
  });

  it("parses upsert command arguments", () => {
    const parsed = parseArgs([
      "upsert",
      "--repo",
      "next-blogkit-pro",
      "--owner",
      "Dendro-X0",
      "--url",
      "https://github.com/Dendro-X0/next-blogkit-pro",
      "--date",
      "2026-03-20",
      "--lighthouse-resolved",
      "7",
      "--signaler-resolved",
      "11",
      "--notes",
      "improves ranking",
    ]);
    expect(parsed.command).toBe("upsert");
    expect(parsed.repo).toBe("next-blogkit-pro");
    expect(parsed.owner).toBe("Dendro-X0");
    expect(parsed.publicRepoUrl).toBe("https://github.com/Dendro-X0/next-blogkit-pro");
    expect(parsed.comparedAt).toBe("2026-03-20");
    expect(parsed.lighthouseResolvedHighImpact).toBe(7);
    expect(parsed.signalerResolvedHighImpact).toBe(11);
  });

  it("detects public github urls and qualification", () => {
    expect(isPublicRepoUrl("https://github.com/Dendro-X0/next-blogkit-pro")).toBe(true);
    expect(isPublicRepoUrl("https://example.com/foo/bar")).toBe(false);

    const improvingEntry: RepoValidationEntry = {
      repo: "a",
      owner: "o",
      publicRepoUrl: "https://github.com/o/a",
      comparedAt: "2026-03-20",
      lighthouseResolvedHighImpact: 5,
      signalerResolvedHighImpact: 9,
      notes: "improving",
    };
    const nonImprovingEntry: RepoValidationEntry = {
      repo: "b",
      owner: "o",
      publicRepoUrl: "https://github.com/o/b",
      comparedAt: "2026-03-20",
      lighthouseResolvedHighImpact: 9,
      signalerResolvedHighImpact: 8,
      notes: "regressed",
    };
    expect(improvementDelta(improvingEntry)).toBe(4);
    expect(improvementDelta(nonImprovingEntry)).toBe(-1);
    expect(qualifies(improvingEntry)).toBe(true);
    expect(qualifies(nonImprovingEntry)).toBe(false);
  });

  it("summarizes totals and qualified rows", () => {
    const evidence: RepoValidationEvidence = {
      schemaVersion: 1,
      generatedAt: new Date().toISOString(),
      entries: [
        {
          repo: "r1",
          owner: "o1",
          publicRepoUrl: "https://github.com/o1/r1",
          comparedAt: "2026-03-20",
          lighthouseResolvedHighImpact: 4,
          signalerResolvedHighImpact: 7,
          notes: "win",
        },
        {
          repo: "r2",
          owner: "o2",
          publicRepoUrl: "https://github.com/o2/r2",
          comparedAt: "2026-03-20",
          lighthouseResolvedHighImpact: 6,
          signalerResolvedHighImpact: 6,
          notes: "tie",
        },
      ],
    };
    const summary = summarize(evidence);
    expect(summary.total).toBe(2);
    expect(summary.improving).toBe(1);
    expect(summary.qualified).toBe(1);
  });
});

