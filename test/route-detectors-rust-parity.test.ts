import { describe, expect, it } from "vitest";
import { spawnSync } from "node:child_process";
import { resolve } from "node:path";
import { detectRoutes } from "../src/route-detectors.js";

function cargoCommand(): string {
  return process.platform === "win32" ? "cargo.exe" : "cargo";
}

function hasCargo(): boolean {
  const result = spawnSync(cargoCommand(), ["--version"], { stdio: "ignore" });
  return result.status === 0;
}

function fixtureRoot(name: string): string {
  return resolve("test/fixtures", name);
}

const describeRust = hasCargo() ? describe : describe.skip;

describeRust("Rust discovery parity", () => {
  const fixtures: readonly string[] = ["next-app", "next-pages", "remix", "spa"];

  for (const fixture of fixtures) {
    it(`matches Node detector output for ${fixture}`, async () => {
      const previousFlag = process.env.SIGNALER_RUST_DISCOVERY;
      let nodeRoutes: Awaited<ReturnType<typeof detectRoutes>> = [];
      let rustRoutes: Awaited<ReturnType<typeof detectRoutes>> = [];
      try {
        process.env.SIGNALER_RUST_DISCOVERY = "";
        nodeRoutes = await detectRoutes({ projectRoot: fixtureRoot(fixture), limit: 200 });
        process.env.SIGNALER_RUST_DISCOVERY = "1";
        rustRoutes = await detectRoutes({ projectRoot: fixtureRoot(fixture), limit: 200 });
      } finally {
        process.env.SIGNALER_RUST_DISCOVERY = previousFlag;
      }

      const nodePaths = nodeRoutes.map((route) => route.path).sort();
      const rustPaths = rustRoutes.map((route) => route.path).sort();
      expect(rustPaths).toEqual(nodePaths);
    });
  }
});
