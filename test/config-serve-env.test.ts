import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it, vi, afterEach } from "vitest";
import { loadConfig, parseServeEnvPair, resolveServeEnv } from "../src/core/config.js";

const baseConfig = {
  baseUrl: "http://127.0.0.1:3000",
  pages: [{ path: "/", label: "Home", devices: ["mobile"] }],
};

describe("serveEnv config", () => {
  it("loads serveEnv key-value pairs from signaler.config.json", async () => {
    const dir = await mkdtemp(join(tmpdir(), "signaler-serve-env-"));
    try {
      const configPath = join(dir, "signaler.config.json");
      await writeFile(
        configPath,
        JSON.stringify({
          ...baseConfig,
          serveEnv: { DEMO_AUTH_BYPASS: "true", AUDIT_MODE: "1" },
        }),
        "utf8",
      );
      const { config } = await loadConfig({ configPath });
      expect(config.serveEnv).toEqual({ DEMO_AUTH_BYPASS: "true", AUDIT_MODE: "1" });
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  });

  it("rejects non-string serveEnv values", async () => {
    const dir = await mkdtemp(join(tmpdir(), "signaler-serve-env-bad-"));
    try {
      const configPath = join(dir, "signaler.config.json");
      await writeFile(
        configPath,
        JSON.stringify({ ...baseConfig, serveEnv: { FLAG: true } }),
        "utf8",
      );
      await expect(loadConfig({ configPath })).rejects.toThrow(/serveEnv\.FLAG must be a non-empty string/);
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  });
});

describe("resolveServeEnv", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("merges env var, config, and CLI with CLI winning", () => {
    vi.stubEnv("SIGNALER_SERVE_ENV", '{"FROM_ENV":"1","SHARED":"env"}');
    const resolved = resolveServeEnv({
      fromConfig: { SHARED: "config", FROM_CONFIG: "1" },
      fromCli: { SHARED: "cli", FROM_CLI: "1" },
    });
    expect(resolved).toEqual({
      FROM_ENV: "1",
      FROM_CONFIG: "1",
      FROM_CLI: "1",
      SHARED: "cli",
    });
  });

  it("parses KEY=VALUE pairs for --serve-env", () => {
    expect(parseServeEnvPair("DEMO_AUTH_BYPASS=true")).toEqual({
      key: "DEMO_AUTH_BYPASS",
      value: "true",
    });
  });
});
