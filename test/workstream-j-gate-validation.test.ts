import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { validateWorkstreamJGateReportFile } from "../benchmarks/workstream-j/validate.js";

describe("workstream-j gate validation", () => {
  it("accepts valid workstream-j gate report shape", async () => {
    const root = await mkdtemp(join(tmpdir(), "signaler-workstream-j-gate-"));
    const reportPath = resolve(root, "workstream-j-gate.json");
    await writeFile(
      reportPath,
      JSON.stringify(
        {
          schemaVersion: 1,
          generatedAt: new Date().toISOString(),
          status: "warn",
          checks: [
            { id: "workstream-j-source-adapters", status: "ok", details: "present", blocking: true },
            { id: "workstream-j-overhead-evidence", status: "warn", details: "missing", blocking: false },
          ],
          summary: { blockingFailures: 0, warnings: 1, manualItems: 1 },
        },
        null,
        2,
      ),
      "utf8",
    );
    const result = await validateWorkstreamJGateReportFile(reportPath);
    expect(result.ok).toBe(true);
    await rm(root, { recursive: true, force: true });
  });

  it("rejects invalid summary counts", async () => {
    const root = await mkdtemp(join(tmpdir(), "signaler-workstream-j-gate-"));
    const reportPath = resolve(root, "workstream-j-gate.json");
    await writeFile(
      reportPath,
      JSON.stringify(
        {
          schemaVersion: 1,
          generatedAt: new Date().toISOString(),
          status: "ok",
          checks: [
            { id: "workstream-j-source-adapters", status: "error", details: "missing", blocking: true },
          ],
          summary: { blockingFailures: 0, warnings: 0, manualItems: 0 },
        },
        null,
        2,
      ),
      "utf8",
    );
    const result = await validateWorkstreamJGateReportFile(reportPath);
    expect(result.ok).toBe(false);
    await rm(root, { recursive: true, force: true });
  });
});
