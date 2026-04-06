import { describe, expect, it } from "vitest";
import { runRustNetworkWorker } from "../src/rust/network-adapter.js";
import { mkdtemp, rm } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";

describe("Rust network fallback behavior", () => {
  it("returns disabled when flags are off", async () => {
    const previousGlobal = process.env.SIGNALER_RUST_NETWORK;
    const previousHealth = process.env.SIGNALER_RUST_HEALTH;
    try {
      delete process.env.SIGNALER_RUST_NETWORK;
      delete process.env.SIGNALER_RUST_HEALTH;
      const result = await runRustNetworkWorker({
        mode: "health",
        baseUrl: "http://127.0.0.1:3000",
        parallel: 1,
        timeoutMs: 5_000,
        retryPolicy: "auto",
        tasks: [{ label: "home", path: "/", url: "http://127.0.0.1:3000/" }],
      });
      expect(result.enabled).toBe(false);
      expect(result.requested).toBe(false);
      expect(result.used).toBe(false);
    } finally {
      process.env.SIGNALER_RUST_NETWORK = previousGlobal;
      process.env.SIGNALER_RUST_HEALTH = previousHealth;
    }
  });

  it("falls back when sidecar execution fails", async () => {
    const previousModeFlag = process.env.SIGNALER_RUST_HEALTH;
    const previousGlobal = process.env.SIGNALER_RUST_NETWORK;
    const previousPath = process.env.PATH;
    const previousSidecarBin = process.env.SIGNALER_RUST_SIDECAR_BIN;
    const invalidSidecarDir = await mkdtemp(join(tmpdir(), "signaler-rust-network-invalid-bin-"));
    try {
      process.env.SIGNALER_RUST_HEALTH = "1";
      delete process.env.SIGNALER_RUST_NETWORK;
      process.env.SIGNALER_RUST_SIDECAR_BIN = invalidSidecarDir;
      process.env.PATH = "";
      const result = await runRustNetworkWorker({
        mode: "health",
        baseUrl: "http://127.0.0.1:3000",
        parallel: 1,
        timeoutMs: 5_000,
        retryPolicy: "auto",
        tasks: [{ label: "home", path: "/", url: "http://127.0.0.1:3000/" }],
      });
      expect(result.enabled).toBe(true);
      expect(result.requested).toBe(true);
      expect(result.used).toBe(false);
      expect(typeof result.fallbackReason).toBe("string");
      expect((result.fallbackReason ?? "").length).toBeGreaterThan(0);
    } finally {
      process.env.SIGNALER_RUST_HEALTH = previousModeFlag;
      process.env.SIGNALER_RUST_NETWORK = previousGlobal;
      process.env.PATH = previousPath;
      process.env.SIGNALER_RUST_SIDECAR_BIN = previousSidecarBin;
      await rm(invalidSidecarDir, { recursive: true, force: true });
    }
  });
});
