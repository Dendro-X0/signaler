import { describe, expect, it } from "vitest";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";

describe("windows installer scaffold", () => {
  it("defines an Inno Setup installer wrapper around the portable payload", async () => {
    const script = await readFile(resolve("release-assets", "windows", "signaler-installer.iss"), "utf8");
    expect(script).toContain("OutputBaseFilename=signaler-{#AppVersion}-windows-setup");
    expect(script).toContain("npm.cmd install");
    expect(script).toContain("{localappdata}\\signaler\\current");
    expect(script).toContain("{localappdata}\\signaler\\bin");
  });

  it("exposes a package script for building the Windows installer", async () => {
    const pkg = JSON.parse(await readFile(resolve("package.json"), "utf8")) as {
      readonly scripts?: Record<string, string>;
    };
    expect(pkg.scripts?.["release:windows-installer"]).toContain("build-windows-installer.ps1");
  });

  it("wires the Windows installer into the GitHub release workflow", async () => {
    const workflow = await readFile(resolve(".github", "workflows", "publish.yml"), "utf8");
    expect(workflow).toContain("release-windows-installer:");
    expect(workflow).toContain("pnpm run release:windows-installer");
    expect(workflow).toContain("signaler-${{ steps.release_meta.outputs.version }}-windows-setup.exe");
  });
});
