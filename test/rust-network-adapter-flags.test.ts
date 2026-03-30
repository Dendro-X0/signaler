import { describe, expect, it } from "vitest";
import { isRustNetworkModeEnabled } from "../src/rust/network-adapter.js";

function withEnv(env: Record<string, string | undefined>, fn: () => void): void {
  const previous: Record<string, string | undefined> = {};
  for (const [key, value] of Object.entries(env)) {
    previous[key] = process.env[key];
    if (value === undefined) {
      delete process.env[key];
    } else {
      process.env[key] = value;
    }
  }
  try {
    fn();
  } finally {
    for (const [key, value] of Object.entries(previous)) {
      if (value === undefined) {
        delete process.env[key];
      } else {
        process.env[key] = value;
      }
    }
  }
}

describe("Rust network adapter flags", () => {
  it("uses global flag when mode-specific flag is unset", () => {
    withEnv(
      {
        SIGNALER_RUST_NETWORK: "1",
        SIGNALER_RUST_HEALTH: undefined,
      },
      () => {
        expect(isRustNetworkModeEnabled("health")).toBe(true);
      },
    );
  });

  it("mode-specific flag overrides global flag", () => {
    withEnv(
      {
        SIGNALER_RUST_NETWORK: "1",
        SIGNALER_RUST_HEALTH: "0",
      },
      () => {
        expect(isRustNetworkModeEnabled("health")).toBe(false);
      },
    );
  });

  it("mode-specific enable works without global flag", () => {
    withEnv(
      {
        SIGNALER_RUST_NETWORK: undefined,
        SIGNALER_RUST_HEADERS: "1",
      },
      () => {
        expect(isRustNetworkModeEnabled("headers")).toBe(true);
      },
    );
  });
});
