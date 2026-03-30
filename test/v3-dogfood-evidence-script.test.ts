import { describe, expect, it } from "vitest";
import {
  daysBetween,
  parseArgs,
  qualifies,
  summarize,
  type DogfoodEvidence,
  type DogfoodEntry,
} from "../scripts/v3-dogfood-evidence.js";

describe("v3 dogfood evidence script", () => {
  it("parses list command", () => {
    const parsed = parseArgs(["list"]);
    expect(parsed.command).toBe("list");
    expect(parsed.filePath.toLowerCase()).toContain("release");
    expect(parsed.filePath.toLowerCase()).toContain("dogfood-evidence.json");
  });

  it("parses upsert command arguments", () => {
    const parsed = parseArgs([
      "upsert",
      "--repo",
      "next-blogkit-pro",
      "--owner",
      "Dendro-X0",
      "--start",
      "2026-03-01",
      "--end",
      "2026-03-20",
      "--notes",
      "dogfood run",
    ]);
    expect(parsed.command).toBe("upsert");
    expect(parsed.repo).toBe("next-blogkit-pro");
    expect(parsed.owner).toBe("Dendro-X0");
    expect(parsed.startDate).toBe("2026-03-01");
    expect(parsed.endDate).toBe("2026-03-20");
    expect(parsed.notes).toBe("dogfood run");
  });

  it("calculates duration and qualification consistently", () => {
    expect(daysBetween("2026-03-01", "2026-03-14")).toBe(13);
    expect(daysBetween("2026-03-01", "2026-03-15")).toBe(14);
    const shortEntry: DogfoodEntry = {
      repo: "a",
      owner: "o",
      startDate: "2026-03-01",
      endDate: "2026-03-14",
      notes: "short",
    };
    const qualifiedEntry: DogfoodEntry = {
      repo: "b",
      owner: "o",
      startDate: "2026-03-01",
      endDate: "2026-03-15",
      notes: "ok",
    };
    expect(qualifies(shortEntry)).toBe(false);
    expect(qualifies(qualifiedEntry)).toBe(true);
  });

  it("summarizes total and qualified entries", () => {
    const evidence: DogfoodEvidence = {
      schemaVersion: 1,
      generatedAt: new Date().toISOString(),
      entries: [
        {
          repo: "r1",
          owner: "o1",
          startDate: "2026-03-01",
          endDate: "2026-03-15",
          notes: "qualified",
        },
        {
          repo: "r2",
          owner: "o2",
          startDate: "2026-03-01",
          endDate: "2026-03-10",
          notes: "short",
        },
      ],
    };
    const summary = summarize(evidence);
    expect(summary.total).toBe(2);
    expect(summary.qualified).toBe(1);
  });
});
