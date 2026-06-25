import { describe, expect, it } from "vitest";
import { mkdtemp, readFile } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { buildAutoConfigFromExplore } from "../src/engine/explore/auto-config.js";
import { writeAutoConfigIfMissing } from "../src/engine/explore/ensure-project-config.js";
import type { RepoExploreManifest } from "../src/engine/explore/repo-explore.js";

function sampleManifest(overrides?: Partial<RepoExploreManifest>): RepoExploreManifest {
  return {
    schemaVersion: 1,
    status: "ok",
    projectRoot: "/tmp/app",
    detectorId: "next-app-router",
    routes: [
      { path: "/", label: "home", source: "filesystem" },
      { path: "/about", label: "about", source: "filesystem" },
    ],
    portHints: [3000, 3001],
    runningServers: [{ baseUrl: "http://127.0.0.1:3000", port: 3000, healthy: true, source: "scan" }],
    recommendAuditBypass: false,
    recommendedBaseUrl: "http://127.0.0.1:3000",
    elapsedMs: 12,
    ...overrides,
  };
}

describe("auto-config", () => {
  it("builds config from explore manifest with healthy server", () => {
    const { config, plan } = buildAutoConfigFromExplore({ manifest: sampleManifest() });
    expect(config.baseUrl).toBe("http://127.0.0.1:3000");
    expect(config.pages).toHaveLength(2);
    expect(config.serve?.mode).toBe("attach");
    expect(config.serve?.portHints).toEqual([3000, 3001]);
    expect(plan.baseUrlSource).toBe("explore-healthy");
    expect(plan.stack).toBe("next-app-router");
  });

  it("falls back to port hint when no server is running", () => {
    const { config, plan } = buildAutoConfigFromExplore({
      manifest: sampleManifest({
        runningServers: [],
        recommendedBaseUrl: undefined,
      }),
    });
    expect(config.baseUrl).toBe("http://127.0.0.1:3000");
    expect(plan.baseUrlSource).toBe("port-hint");
    expect(plan.notes.some((note) => note.includes("No loopback server"))).toBe(true);
  });

  it("writes config when missing and skips when present", async () => {
    const root = await mkdtemp(join(tmpdir(), "signaler-auto-config-"));
    const configPath = join(root, "signaler.config.json");
    const manifest = sampleManifest({ projectRoot: root });

    const first = await writeAutoConfigIfMissing({ configPath, manifest, quiet: true });
    expect(first.wrote).toBe(true);
    const raw = await readFile(configPath, "utf8");
    const parsed = JSON.parse(raw) as { baseUrl: string; pages: unknown[] };
    expect(parsed.baseUrl).toBe("http://127.0.0.1:3000");
    expect(parsed.pages.length).toBe(2);

    const second = await writeAutoConfigIfMissing({ configPath, manifest, quiet: true });
    expect(second.wrote).toBe(false);
  });
});
