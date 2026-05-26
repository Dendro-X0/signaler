import { describe, expect, it } from "vitest";
import { mkdtemp, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { loadConfig } from "../src/core/config.js";

const baseConfig = {
  baseUrl: "http://127.0.0.1:3000",
  pages: [{ path: "/", label: "Home", devices: ["mobile"] }],
};

describe("qualityGate config", () => {
  it("loads qualityGate thresholds from signaler.config.json", async () => {
    const root = await mkdtemp(join(tmpdir(), "signaler-qg-"));
    const configPath = join(root, "signaler.config.json");
    await writeFile(
      configPath,
      JSON.stringify({
        ...baseConfig,
        qualityGate: {
          maxRedPerfIssues: 0,
          minCategoryScores: { accessibility: 90 },
          requireHeadersPass: true,
        },
      }),
      "utf8",
    );
    const { config } = await loadConfig({ configPath });
    expect(config.qualityGate?.maxRedPerfIssues).toBe(0);
    expect(config.qualityGate?.minCategoryScores?.accessibility).toBe(90);
    expect(config.qualityGate?.requireHeadersPass).toBe(true);
  });

  it("rejects invalid maxRedPerfIssues", async () => {
    const root = await mkdtemp(join(tmpdir(), "signaler-qg-"));
    const configPath = join(root, "signaler.config.json");
    await writeFile(
      configPath,
      JSON.stringify({
        ...baseConfig,
        qualityGate: { maxRedPerfIssues: -1 },
      }),
      "utf8",
    );
    await expect(loadConfig({ configPath })).rejects.toThrow(/maxRedPerfIssues/);
  });
});
