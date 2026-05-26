import { describe, expect, it } from "vitest";
import { mkdtemp, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { loadConfig } from "../src/core/config.js";

const baseConfig = {
  baseUrl: "http://127.0.0.1:3000",
  pages: [{ path: "/", label: "Home", devices: ["mobile"] }],
};

describe("baselineCompare config", () => {
  it("loads baselineCompare from signaler.config.json", async () => {
    const root = await mkdtemp(join(tmpdir(), "signaler-bc-"));
    const configPath = join(root, "signaler.config.json");
    await writeFile(
      configPath,
      JSON.stringify({
        ...baseConfig,
        baselineCompare: {
          baselineDir: ".signaler-main",
          maxRedIncrease: 0,
        },
      }),
      "utf8",
    );
    const { config } = await loadConfig({ configPath });
    expect(config.baselineCompare?.baselineDir).toBe(".signaler-main");
    expect(config.baselineCompare?.maxRedIncrease).toBe(0);
  });
});
