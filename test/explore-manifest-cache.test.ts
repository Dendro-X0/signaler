import { describe, expect, it } from "vitest";
import { mkdir, writeFile, utimes } from "node:fs/promises";
import { join } from "node:path";
import { mkdtemp } from "node:fs/promises";
import { tmpdir } from "node:os";
import {
  EXPLORE_MANIFEST_MAX_AGE_MS,
  loadOrRunRepoExplore,
  readExploreManifestIfFresh,
  type RepoExploreManifest,
} from "../src/engine/explore/repo-explore.js";

function sampleManifest(projectRoot: string): RepoExploreManifest {
  return {
    schemaVersion: 1,
    status: "ok",
    projectRoot,
    routes: [{ path: "/", label: "home", source: "test" }],
    portHints: [3000],
    runningServers: [],
    recommendAuditBypass: false,
    elapsedMs: 12,
  };
}

describe("explore manifest cache", () => {
  it("returns cached manifest when fresh and project root matches", async () => {
    const root = await mkdtemp(join(tmpdir(), "signaler-explore-cache-"));
    const outputDir = join(root, ".signaler");
    await mkdir(outputDir, { recursive: true });
    const manifest = sampleManifest(root);
    const path = join(outputDir, "explore.json");
    await writeFile(path, `${JSON.stringify(manifest, null, 2)}\n`, "utf8");

    const cached = await readExploreManifestIfFresh({ outputDir, projectRoot: root });
    expect(cached?.routes).toHaveLength(1);
    expect(cached?.projectRoot).toBe(root);
  });

  it("ignores stale explore manifests", async () => {
    const root = await mkdtemp(join(tmpdir(), "signaler-explore-stale-"));
    const outputDir = join(root, ".signaler");
    await mkdir(outputDir, { recursive: true });
    const path = join(outputDir, "explore.json");
    await writeFile(path, `${JSON.stringify(sampleManifest(root), null, 2)}\n`, "utf8");
    const stale = Date.now() - EXPLORE_MANIFEST_MAX_AGE_MS - 1000;
    await utimes(path, stale / 1000, stale / 1000);

    const cached = await readExploreManifestIfFresh({ outputDir, projectRoot: root });
    expect(cached).toBeUndefined();
  });

  it("loadOrRunRepoExplore reuses cache without rescanning", async () => {
    const root = await mkdtemp(join(tmpdir(), "signaler-explore-load-"));
    const outputDir = join(root, ".signaler");
    await mkdir(outputDir, { recursive: true });
    await writeFile(
      join(outputDir, "explore.json"),
      `${JSON.stringify(sampleManifest(root), null, 2)}\n`,
      "utf8",
    );

    const result = await loadOrRunRepoExplore({
      projectRoot: root,
      outputDir,
    });
    expect(result.fromCache).toBe(true);
    expect(result.manifest.routes[0]?.path).toBe("/");
  });
});
