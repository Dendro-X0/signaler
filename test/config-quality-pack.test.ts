import { describe, expect, it } from "vitest";
import { mkdtemp, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { loadConfig } from "../src/core/config.js";

const baseConfig = {
  baseUrl: "http://127.0.0.1:3000",
  pages: [{ path: "/", label: "Home", devices: ["mobile"] }],
};

describe("qualityPack config", () => {
  it("loads qualityPack thresholds from signaler.config.json", async () => {
    const root = await mkdtemp(join(tmpdir(), "signaler-qp-"));
    const configPath = join(root, "signaler.config.json");
    await writeFile(
      configPath,
      JSON.stringify({
        ...baseConfig,
        qualityPack: {
          maxHeaderFailures: 1,
          maxBrokenLinks: 2,
        },
      }),
      "utf8",
    );
    const { config } = await loadConfig({ configPath });
    expect(config.qualityPack?.maxHeaderFailures).toBe(1);
    expect(config.qualityPack?.maxBrokenLinks).toBe(2);
  });
});
