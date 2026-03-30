import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { validateV3ReleaseGateReportFile } from "../benchmarks/v3-release/validate.js";

describe("v3 release gate validation", () => {
  it("accepts valid v3 release gate report shape", async () => {
    const root = await mkdtemp(join(tmpdir(), "signaler-v3-release-gate-"));
    const reportPath = resolve(root, "v3-release-gate.json");
    await writeFile(
      reportPath,
      JSON.stringify(
        {
          schemaVersion: 1,
          generatedAt: new Date().toISOString(),
          status: "warn",
          checks: [
            { id: "v3-core-docs", status: "ok", details: "present", blocking: true },
            { id: "release-notes-draft", status: "warn", details: "missing", blocking: false },
          ],
          summary: { blockingFailures: 0, warnings: 1, manualItems: 1 },
        },
        null,
        2,
      ),
      "utf8",
    );
    const result = await validateV3ReleaseGateReportFile(reportPath);
    expect(result.ok).toBe(true);
    await rm(root, { recursive: true, force: true });
  });

  it("rejects invalid summary counts", async () => {
    const root = await mkdtemp(join(tmpdir(), "signaler-v3-release-gate-"));
    const reportPath = resolve(root, "v3-release-gate.json");
    await writeFile(
      reportPath,
      JSON.stringify(
        {
          schemaVersion: 1,
          generatedAt: new Date().toISOString(),
          status: "ok",
          checks: [
            { id: "v3-core-docs", status: "error", details: "missing", blocking: true },
          ],
          summary: { blockingFailures: 0, warnings: 0, manualItems: 0 },
        },
        null,
        2,
      ),
      "utf8",
    );
    const result = await validateV3ReleaseGateReportFile(reportPath);
    expect(result.ok).toBe(false);
    await rm(root, { recursive: true, force: true });
  });
});
