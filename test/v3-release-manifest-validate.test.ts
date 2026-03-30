import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { parseArgs, validateReleaseManifestFile } from "../scripts/v3-release-manifest-validate.js";

async function createRequiredInstallScripts(root: string): Promise<void> {
  await mkdir(resolve(root, "scripts"), { recursive: true });
  await writeFile(resolve(root, "scripts/create-release-package.sh"), "#!/usr/bin/env bash\n", "utf8");
  await writeFile(resolve(root, "scripts/create-release-package.ps1"), "Write-Output \"ok\"\n", "utf8");
  await writeFile(resolve(root, "scripts/setup-bash-wrapper.sh"), "#!/usr/bin/env bash\n", "utf8");
  await writeFile(resolve(root, "scripts/setup-bash-wrapper.ps1"), "Write-Output \"ok\"\n", "utf8");
}

describe("v3 release manifest policy validation", () => {
  it("accepts valid manifest with tgz and required gates", async () => {
    const root = await mkdtemp(join(tmpdir(), "signaler-v3-manifest-validate-"));
    await mkdir(resolve(root, "dist"), { recursive: true });
    await mkdir(resolve(root, "benchmarks/out"), { recursive: true });
    await createRequiredInstallScripts(root);

    await writeFile(resolve(root, "dist/signaler-3.0.0-rc.1.tgz"), "tgz-bytes", "utf8");
    await writeFile(resolve(root, "benchmarks/out/v3-release-gate.json"), JSON.stringify({ status: "ok" }), "utf8");
    await writeFile(resolve(root, "benchmarks/out/v63-success-gate.json"), JSON.stringify({ status: "ok" }), "utf8");

    const manifestPath = resolve(root, "release/v3/release-manifest.generated.json");
    await mkdir(resolve(root, "release/v3"), { recursive: true });
    await writeFile(
      manifestPath,
      JSON.stringify(
        {
          schemaVersion: 1,
          generatedAt: new Date().toISOString(),
          release: { version: "3.0.0-rc.1", channel: "rc", gitCommit: "abcdef1234567" },
          assets: [
            {
              path: "dist/signaler-3.0.0-rc.1.tgz",
              sha256: "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
              sizeBytes: 9,
            },
          ],
          gateReports: [
            { id: "v3-release-phase1", path: "benchmarks/out/v3-release-gate.json", status: "ok" },
            { id: "v63-success-gate", path: "benchmarks/out/v63-success-gate.json", status: "warn" },
          ],
          environment: { nodeVersion: process.version, platform: "win32-x64", packageManager: "pnpm" },
        },
        null,
        2,
      ),
      "utf8",
    );

    const parsed = parseArgs(["--manifest", manifestPath, "--root", root]);
    const result = await validateReleaseManifestFile(parsed);
    expect(result.ok).toBe(true);

    await rm(root, { recursive: true, force: true });
  });

  it("rejects manifest without tgz assets by default", async () => {
    const root = await mkdtemp(join(tmpdir(), "signaler-v3-manifest-validate-"));
    await mkdir(resolve(root, "benchmarks/out"), { recursive: true });
    await createRequiredInstallScripts(root);
    await writeFile(resolve(root, "benchmarks/out/v3-release-gate.json"), JSON.stringify({ status: "ok" }), "utf8");
    await writeFile(resolve(root, "benchmarks/out/v63-success-gate.json"), JSON.stringify({ status: "ok" }), "utf8");

    const manifestPath = resolve(root, "release/v3/release-manifest.generated.json");
    await mkdir(resolve(root, "release/v3"), { recursive: true });
    await writeFile(
      manifestPath,
      JSON.stringify(
        {
          schemaVersion: 1,
          generatedAt: new Date().toISOString(),
          release: { version: "3.0.0-rc.1", channel: "rc", gitCommit: "abcdef1234567" },
          assets: [
            {
              path: "benchmarks/out/v3-release-gate.json",
              sha256: "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
              sizeBytes: 16,
            },
          ],
          gateReports: [
            { id: "v3-release-phase1", path: "benchmarks/out/v3-release-gate.json", status: "ok" },
            { id: "v63-success-gate", path: "benchmarks/out/v63-success-gate.json", status: "ok" },
          ],
          environment: { nodeVersion: process.version, platform: "win32-x64", packageManager: "pnpm" },
        },
        null,
        2,
      ),
      "utf8",
    );

    const parsed = parseArgs(["--manifest", manifestPath, "--root", root]);
    const result = await validateReleaseManifestFile(parsed);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.errors.join("\n")).toContain("at least one .tgz");
    }

    await rm(root, { recursive: true, force: true });
  });

  it("rejects missing required gate ids", async () => {
    const root = await mkdtemp(join(tmpdir(), "signaler-v3-manifest-validate-"));
    await mkdir(resolve(root, "dist"), { recursive: true });
    await mkdir(resolve(root, "benchmarks/out"), { recursive: true });
    await createRequiredInstallScripts(root);
    await writeFile(resolve(root, "dist/signaler-3.0.0-rc.1.tgz"), "tgz-bytes", "utf8");
    await writeFile(resolve(root, "benchmarks/out/custom-gate.json"), JSON.stringify({ status: "ok" }), "utf8");

    const manifestPath = resolve(root, "release/v3/release-manifest.generated.json");
    await mkdir(resolve(root, "release/v3"), { recursive: true });
    await writeFile(
      manifestPath,
      JSON.stringify(
        {
          schemaVersion: 1,
          generatedAt: new Date().toISOString(),
          release: { version: "3.0.0-rc.1", channel: "rc", gitCommit: "abcdef1234567" },
          assets: [
            {
              path: "dist/signaler-3.0.0-rc.1.tgz",
              sha256: "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
              sizeBytes: 9,
            },
          ],
          gateReports: [
            { id: "custom-gate", path: "benchmarks/out/custom-gate.json", status: "ok" },
          ],
          environment: { nodeVersion: process.version, platform: "win32-x64", packageManager: "pnpm" },
        },
        null,
        2,
      ),
      "utf8",
    );

    const parsed = parseArgs(["--manifest", manifestPath, "--root", root]);
    const result = await validateReleaseManifestFile(parsed);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      const rendered = result.errors.join("\n");
      expect(rendered).toContain("required gate id missing: v3-release-phase1");
      expect(rendered).toContain("required gate id missing: v63-success-gate");
    }

    await rm(root, { recursive: true, force: true });
  });
});
