import { describe, expect, it } from "vitest";
import { resolve } from "node:path";
import { DEFAULT_SIGNALER_REPO, parseUpgradeArgs, resolveGlobalInstallPaths, resolveUpgradeDefaults } from "../src/upgrade-cli.js";
import { buildUninstallPlan, parseUninstallArgs } from "../src/uninstall-cli.js";

describe("global install lifecycle", () => {
  it("uses the canonical repo and latest version by default", () => {
    const parsed = parseUpgradeArgs(["node", "signaler"]);
    const resolved = resolveUpgradeDefaults(parsed);
    expect(resolved.repo).toBe(DEFAULT_SIGNALER_REPO);
    expect(resolved.version).toBe("latest");
    expect(resolved.installDir.length).toBeGreaterThan(0);
    expect(resolved.binDir.length).toBeGreaterThan(0);
  });

  it("parses dry-run install flags", () => {
    const parsed = parseUpgradeArgs([
      "node",
      "signaler",
      "--version",
      "v3.1.4",
      "--dry-run",
      "--json",
    ]);
    expect(parsed.version).toBe("v3.1.4");
    expect(parsed.dryRun).toBe(true);
    expect(parsed.json).toBe(true);
  });

  it("builds a global uninstall plan for the portable launcher", () => {
    const parsed = parseUninstallArgs([
      "node",
      "signaler",
      "--global",
      "--dry-run",
    ]);
    const plan = buildUninstallPlan(parsed);
    const paths = resolveGlobalInstallPaths();
    expect(parsed.global).toBe(true);
    expect(plan.some((entry) => entry.path === paths.installDir)).toBe(true);
    expect(plan.some((entry) => entry.path === resolve(paths.binDir, "signaler"))).toBe(true);
    if (process.platform === "win32") {
      expect(plan.some((entry) => entry.path === resolve(paths.binDir, "signaler.cmd"))).toBe(true);
    }
  });
});
