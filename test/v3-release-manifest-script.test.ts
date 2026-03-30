import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { describe, expect, it } from "vitest";
import {
  generateManifest,
  parseArgs,
  readGateSummary,
  type ParsedArgs,
} from "../scripts/v3-release-manifest.js";

describe("v3 release manifest script", () => {
  it("parses generate arguments with repeated assets and gates", () => {
    const parsed = parseArgs([
      "generate",
      "--version",
      "3.0.0-rc.1",
      "--channel",
      "rc",
      "--asset",
      "README.md",
      "--asset",
      "benchmarks/out/v3-release-gate.json",
      "--gate",
      "benchmarks/out/v3-release-gate.json",
      "--gate",
      "benchmarks/out/v63-success-gate.json",
    ]);
    expect(parsed.command).toBe("generate");
    expect(parsed.version).toBe("3.0.0-rc.1");
    expect(parsed.channel).toBe("rc");
    expect(parsed.assets.length).toBe(2);
    expect(parsed.gateReports.length).toBe(2);
  });

  it("rejects missing required assets", () => {
    expect(() =>
      parseArgs([
        "generate",
        "--version",
        "3.0.0-rc.1",
        "--channel",
        "rc",
        "--gate",
        "benchmarks/out/v3-release-gate.json",
      ])).toThrow(/At least one --asset is required/i);
  });

  it("maps known gate ids from file path hints", async () => {
    const root = await mkdtemp(join(tmpdir(), "signaler-v3-manifest-"));
    const gatePath = resolve(root, "benchmarks", "out", "v63-success-gate.json");
    await mkdir(resolve(root, "benchmarks", "out"), { recursive: true });
    await writeFile(gatePath, JSON.stringify({ status: "warn" }), "utf8");
    const summary = await readGateSummary(gatePath);
    expect(summary.id).toBe("v63-success-gate");
    expect(summary.status).toBe("warn");
    await rm(root, { recursive: true, force: true });
  });

  it("generates manifest with deterministic release fields and checksums", async () => {
    const root = await mkdtemp(join(tmpdir(), "signaler-v3-manifest-"));
    const assetPath = resolve(root, "signaler-3.0.0-rc.1.tgz");
    const gatePath = resolve(root, "v3-release-gate.json");
    await writeFile(assetPath, "asset-bytes", "utf8");
    await writeFile(gatePath, JSON.stringify({ status: "ok" }), "utf8");
    const args: ParsedArgs = {
      command: "generate",
      outPath: resolve(root, "release-manifest.generated.json"),
      version: "3.0.0-rc.1",
      channel: "rc",
      gitCommit: "abc1234",
      assets: [assetPath],
      gateReports: [gatePath],
    };
    const manifest = await generateManifest(args);
    expect(manifest.schemaVersion).toBe(1);
    expect(manifest.release.version).toBe("3.0.0-rc.1");
    expect(manifest.release.gitCommit).toBe("abc1234");
    expect(manifest.assets).toHaveLength(1);
    expect(manifest.assets[0]?.sizeBytes).toBeGreaterThan(0);
    expect(manifest.assets[0]?.sha256.length).toBe(64);
    expect(manifest.gateReports[0]?.status).toBe("ok");
    await rm(root, { recursive: true, force: true });
  });
});
