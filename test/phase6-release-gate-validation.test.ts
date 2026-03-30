import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { validatePhase6ReportFile } from "../benchmarks/phase6/validate.js";

describe("phase6 release gate validation", () => {
  it("accepts valid phase6 report shape", async () => {
    const root = await mkdtemp(join(tmpdir(), "signaler-phase6-"));
    const reportPath = resolve(root, "phase6-release-gate.json");
    await writeFile(
      reportPath,
      JSON.stringify(
        {
          schemaVersion: 1,
          generatedAt: new Date().toISOString(),
          status: "warn",
          checks: [
            { id: "docs-existence", status: "ok", details: "present", blocking: true },
            { id: "dogfood-evidence", status: "warn", details: "2/3 complete", blocking: false },
          ],
          summary: { blockingFailures: 0, warnings: 1, manualItems: 1 },
        },
        null,
        2,
      ),
      "utf8",
    );
    const result = await validatePhase6ReportFile(reportPath);
    expect(result.ok).toBe(true);
    await rm(root, { recursive: true, force: true });
  });

  it("rejects invalid summary counts", async () => {
    const root = await mkdtemp(join(tmpdir(), "signaler-phase6-"));
    const reportPath = resolve(root, "phase6-release-gate.json");
    await writeFile(
      reportPath,
      JSON.stringify(
        {
          schemaVersion: 1,
          generatedAt: new Date().toISOString(),
          status: "ok",
          checks: [
            { id: "docs-existence", status: "error", details: "missing", blocking: true },
          ],
          summary: { blockingFailures: 0, warnings: 0, manualItems: 0 },
        },
        null,
        2,
      ),
      "utf8",
    );
    const result = await validatePhase6ReportFile(reportPath);
    expect(result.ok).toBe(false);
    await rm(root, { recursive: true, force: true });
  });
});
