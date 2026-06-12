import { mkdir, writeFile } from "node:fs/promises";
import { mkdtemp } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { describe, expect, it } from "vitest";
import { buildAndWriteBenchmarkAutoBridge } from "../src/benchmark-auto-bridge.js";
import { loadMultiBenchmarkSignalsFromFiles } from "../src/multi-benchmark-signals.js";

describe("benchmark auto-bridge", () => {
  it("writes bridge fixtures from side-runner artifacts", async () => {
    const root = await mkdtemp(join(tmpdir(), "signaler-auto-bridge-"));
    await mkdir(root, { recursive: true });

    await writeFile(
      join(root, "issues.json"),
      `${JSON.stringify({
        topIssues: [{ id: "unused-javascript", title: "Reduce unused JavaScript", count: 1, totalMs: 100 }],
        failing: [{ path: "/", topOpportunities: [{ id: "server-response-time", title: "Reduce server response time" }] }],
      })}\n`,
      "utf8",
    );

    await writeFile(
      join(root, "headers.json"),
      `${JSON.stringify({
        meta: { baseUrl: "https://example.com", completedAt: "2026-03-30T00:02:00.000Z" },
        results: [
          {
            path: "/",
            url: "https://example.com/",
            statusCode: 200,
            missing: ["strict-transport-security", "content-security-policy"],
            present: ["x-content-type-options"],
          },
        ],
      })}\n`,
      "utf8",
    );

    await writeFile(
      join(root, "health.json"),
      `${JSON.stringify({
        meta: { completedAt: "2026-03-30T00:03:00.000Z" },
        results: [{ path: "/", url: "https://example.com/", statusCode: 503, totalMs: 900 }],
      })}\n`,
      "utf8",
    );

    const bridge = await buildAndWriteBenchmarkAutoBridge({ outputDir: root });

    expect(bridge.families).toContain("security-baseline");
    expect(bridge.families).toContain("reliability-slo");
    expect(bridge.signalPaths.length).toBeGreaterThanOrEqual(2);

    const loaded = await loadMultiBenchmarkSignalsFromFiles(bridge.signalPaths);
    expect(loaded?.sourceIds).toContain("security-baseline");
    expect(loaded?.sourceIds).toContain("reliability-slo");
    expect((loaded?.records.length ?? 0) > 0).toBe(true);
  });

  it("returns empty families when no side-runner artifacts exist", async () => {
    const root = await mkdtemp(join(tmpdir(), "signaler-auto-bridge-empty-"));
    const bridge = await buildAndWriteBenchmarkAutoBridge({ outputDir: root });
    expect(bridge.families).toEqual([]);
    expect(bridge.signalPaths).toEqual([]);
  });
});
