import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { validateV63SuccessGateReportFile } from "../benchmarks/v63/validate.js";

describe("v6.3 success gate validation", () => {
  it("accepts valid v6.3 success gate report shape", async () => {
    const root = await mkdtemp(join(tmpdir(), "signaler-v63-gate-"));
    const reportPath = resolve(root, "v63-success-gate.json");
    await writeFile(
      reportPath,
      JSON.stringify(
        {
          schemaVersion: 1,
          generatedAt: new Date().toISOString(),
          status: "warn",
          checks: [
            { id: "canonical-flow-docs-v63", status: "ok", details: "present", blocking: true },
            { id: "loop-smoke-evidence", status: "warn", details: "missing evidence", blocking: false },
          ],
          summary: { blockingFailures: 0, warnings: 1, manualItems: 1 },
        },
        null,
        2,
      ),
      "utf8",
    );
    const result = await validateV63SuccessGateReportFile(reportPath);
    expect(result.ok).toBe(true);
    await rm(root, { recursive: true, force: true });
  });

  it("rejects invalid summary counts", async () => {
    const root = await mkdtemp(join(tmpdir(), "signaler-v63-gate-"));
    const reportPath = resolve(root, "v63-success-gate.json");
    await writeFile(
      reportPath,
      JSON.stringify(
        {
          schemaVersion: 1,
          generatedAt: new Date().toISOString(),
          status: "ok",
          checks: [
            { id: "canonical-flow-docs-v63", status: "error", details: "missing", blocking: true },
          ],
          summary: { blockingFailures: 0, warnings: 0, manualItems: 0 },
        },
        null,
        2,
      ),
      "utf8",
    );
    const result = await validateV63SuccessGateReportFile(reportPath);
    expect(result.ok).toBe(false);
    await rm(root, { recursive: true, force: true });
  });
});
