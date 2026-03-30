import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { describe, expect, it } from "vitest";
import {
  parseArgs,
  writeEvidence,
  type CrossPlatformSmokeEvidence,
} from "../benchmarks/phase6/cross-platform-evidence.js";

describe("phase6 cross-platform evidence script", () => {
  it("parses os and output flags", () => {
    const parsed = parseArgs([
      "--os",
      "windows-latest",
      "--out-json",
      "benchmarks/out/cross-platform-smoke-windows-latest.json",
      "--out-md",
      "benchmarks/out/cross-platform-smoke-windows-latest.md",
    ]);
    expect(parsed.os).toBe("windows-latest");
    expect(parsed.outJsonPath.toLowerCase()).toContain("cross-platform-smoke-windows-latest.json");
    expect(parsed.outMarkdownPath.toLowerCase()).toContain("cross-platform-smoke-windows-latest.md");
  });

  it("writes schema-valid evidence with pass flags", async () => {
    const root = await mkdtemp(join(tmpdir(), "signaler-phase6-cross-platform-"));
    const outJsonPath = resolve(root, "cross-platform-smoke-ubuntu-latest.json");
    const outMarkdownPath = resolve(root, "cross-platform-smoke-ubuntu-latest.md");
    const evidence = await writeEvidence({
      os: "ubuntu-latest",
      outJsonPath,
      outMarkdownPath,
    });

    expect(evidence.schemaVersion).toBe(1);
    expect(evidence.os).toBe("ubuntu-latest");
    expect(evidence.smoke.testSmokePassed).toBe(true);
    expect(evidence.smoke.phase6SmokePassed).toBe(true);

    const raw = await readFile(outJsonPath, "utf8");
    const parsed = JSON.parse(raw) as CrossPlatformSmokeEvidence;
    expect(parsed.schemaVersion).toBe(1);
    expect(parsed.os).toBe("ubuntu-latest");

    await rm(root, { recursive: true, force: true });
  });
});
