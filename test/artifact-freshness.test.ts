import { mkdir, writeFile } from "node:fs/promises";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { evaluateArtifactFreshness } from "../src/artifact-freshness.js";

async function withDir(fn: (dir: string) => Promise<void>): Promise<void> {
  const root = await mkdtemp(join(tmpdir(), "signaler-freshness-"));
  try {
    await fn(resolve(root, ".signaler"));
  } finally {
    await rm(root, { recursive: true, force: true });
  }
}

describe("artifact freshness", () => {
  it("returns unknown when job-latest is missing", async () => {
    await withDir(async (dir) => {
      await mkdir(dir, { recursive: true });
      const report = await evaluateArtifactFreshness(dir);
      expect(report.state).toBe("unknown");
      expect(report.warnings.length).toBeGreaterThan(0);
    });
  });

  it("marks stale when managed serve failed and run predates job", async () => {
    await withDir(async (dir) => {
      await mkdir(dir, { recursive: true });
      await writeFile(
        resolve(dir, "run.json"),
        JSON.stringify({ completedAt: "2026-05-28T10:00:00.000Z" }),
        "utf8",
      );
      await writeFile(
        resolve(dir, "job-latest.json"),
        JSON.stringify({
          schemaVersion: 1,
          jobId: "job-1",
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
      const report = await evaluateArtifactFreshness(dir);
      expect(report.state).toBe("stale");
      expect(report.trustArtifacts).toBe(false);
    });
  });

  it("marks incomplete when analyze failed after successful run", async () => {
    await withDir(async (dir) => {
      await mkdir(dir, { recursive: true });
      await writeFile(
        resolve(dir, "run.json"),
        JSON.stringify({ completedAt: "2026-05-28T11:00:30.000Z" }),
        "utf8",
      );
      await writeFile(
        resolve(dir, "job-latest.json"),
        JSON.stringify({
          schemaVersion: 1,
          jobId: "job-2",
          status: "failed",
          startedAt: "2026-05-28T11:00:00.000Z",
          completedAt: "2026-05-28T11:00:35.000Z",
          elapsedMs: 35000,
          steps: [
            { command: "run", exitCode: 0, elapsedMs: 30000 },
            { command: "analyze", exitCode: 1, elapsedMs: 10 },
          ],
          primaryArtifacts: [],
          exitCode: 2,
          failedStep: "analyze",
        }),
        "utf8",
      );
      const report = await evaluateArtifactFreshness(dir);
      expect(report.state).toBe("incomplete");
      expect(report.trustArtifacts).toBe(false);
      expect(report.warnings.some((warning) => warning.includes("analyze"))).toBe(true);
    });
  });

  it("marks fresh when latest job succeeded and run is current", async () => {
    await withDir(async (dir) => {
      await mkdir(dir, { recursive: true });
      await writeFile(
        resolve(dir, "run.json"),
        JSON.stringify({ completedAt: "2026-05-28T11:00:30.000Z" }),
        "utf8",
      );
      await writeFile(
        resolve(dir, "job-latest.json"),
        JSON.stringify({
          schemaVersion: 1,
          jobId: "job-3",
          status: "success",
          startedAt: "2026-05-28T11:00:00.000Z",
          completedAt: "2026-05-28T11:00:35.000Z",
          elapsedMs: 35000,
          steps: [
            { command: "run", exitCode: 0, elapsedMs: 30000 },
            { command: "analyze", exitCode: 0, elapsedMs: 10 },
          ],
          primaryArtifacts: [],
          exitCode: 0,
        }),
        "utf8",
      );
      const report = await evaluateArtifactFreshness(dir);
      expect(report.state).toBe("fresh");
      expect(report.trustArtifacts).toBe(true);
    });
  });
});
