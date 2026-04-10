import { describe, expect, it } from "vitest";
import { mkdtemp, readFile, rm, stat } from "node:fs/promises";
import { join, resolve } from "node:path";
import { tmpdir } from "node:os";
import { installShim, parseInstallShimArgs } from "../src/install-shim-cli.js";

describe("install-shim cli", () => {
  it("parses install-shim flags", () => {
    const parsed = parseInstallShimArgs([
      "node",
      "signaler",
      "--dir",
      "tmp/shims",
      "--force",
      "--dry-run",
      "--json",
    ]);
    expect(parsed.force).toBe(true);
    expect(parsed.dryRun).toBe(true);
    expect(parsed.json).toBe(true);
    expect(parsed.targetDir.toLowerCase()).toContain("tmp");
  });

  it("creates shim files in target directory", async () => {
    const root = await mkdtemp(join(tmpdir(), "signaler-install-shim-"));
    const targetDir = resolve(root, "bin");
    try {
      const result = await installShim({
        targetDir,
        force: false,
        dryRun: false,
        json: false,
        help: false,
      });
      expect(result.ok).toBe(true);
      await stat(resolve(targetDir, "signaler"));
      await stat(resolve(targetDir, "signalar"));
      const bashShim = await readFile(resolve(targetDir, "signaler"), "utf8");
      expect(bashShim).toContain("npx jsr run @signaler/cli");
      const bashAliasShim = await readFile(resolve(targetDir, "signalar"), "utf8");
      expect(bashAliasShim).toContain("npx jsr run @signaler/cli");
      if (process.platform === "win32") {
        await stat(resolve(targetDir, "signaler.cmd"));
        await stat(resolve(targetDir, "signalar.cmd"));
      }
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });
});
