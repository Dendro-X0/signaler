import { mkdir, readFile, writeFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { describe, expect, it } from "vitest";
import {
  finalizeArtifactLayout,
  materializeArtifactLayout,
  parseArtifactLayoutMode,
  resolveArtifactPath,
} from "../src/artifact-layout/index.js";

async function withDir(fn: (dir: string) => Promise<void>): Promise<void> {
  const root = await mkdtemp(join(tmpdir(), "signaler-layout-"));
  try {
    await fn(root);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
}

describe("artifact layout", () => {
  it("parses layout mode", () => {
    expect(parseArtifactLayoutMode("tree")).toBe("tree");
    expect(parseArtifactLayoutMode("flat")).toBe("flat");
    expect(() => parseArtifactLayoutMode("nested")).toThrow(/tree|flat/);
  });

  it("materializes tree layout from flat artifacts", async () => {
    await withDir(async (dir) => {
      await mkdir(dir, { recursive: true });
      await writeFile(
        resolve(dir, "agent-index.json"),
        JSON.stringify({ contractVersion: "v3", topSuggestions: [] }),
        "utf8",
      );
      await writeFile(
        resolve(dir, "performance-triage.json"),
        JSON.stringify({ schemaVersion: 1, uniqueIssues: [] }),
        "utf8",
      );
      await writeFile(resolve(dir, "headers.json"), JSON.stringify({ results: [] }), "utf8");

      const result = await materializeArtifactLayout({ outputDir: dir, layout: "tree" });
      expect(result?.copiedCount).toBeGreaterThanOrEqual(3);
      expect(result?.prunedFiles).toBeGreaterThanOrEqual(3);

      expect(existsSync(resolve(dir, "agent-index.json"))).toBe(false);
      expect(existsSync(resolve(dir, "agent/index.json"))).toBe(true);
      expect(existsSync(resolve(dir, "manifest.json"))).toBe(true);
      expect(existsSync(resolve(dir, "INDEX.md"))).toBe(true);

      const rootNames = (await import("node:fs/promises")).readdir(dir);
      const names = await rootNames;
      const rootJson = names.filter((name) => name.endsWith(".json"));
      expect(rootJson).toEqual(["manifest.json"]);

      const manifest = JSON.parse(await readFile(resolve(dir, "manifest.json"), "utf8")) as {
        layout: string;
        artifacts: readonly { id: string; path: string }[];
      };
      expect(manifest.layout).toBe("tree");
      expect(manifest.artifacts.some((entry) => entry.id === "agent-index" && entry.path === "agent/index.json")).toBe(true);

      const indexMd = await readFile(resolve(dir, "INDEX.md"), "utf8");
      expect(indexMd).toContain("manifest.json");
      expect(indexMd).toContain("agent/");

      const agentEntrypoints = JSON.parse(await readFile(resolve(dir, "agent/entrypoints.json"), "utf8")) as {
        readOrder: readonly { id: string; path: string }[];
      };
      expect(agentEntrypoints.readOrder.some((entry) => entry.id === "agent-index")).toBe(true);
    });
  });

  it("resolveArtifactPath prefers manifest tree path", async () => {
    await withDir(async (dir) => {
      await mkdir(dir, { recursive: true });
      await writeFile(resolve(dir, "agent-index.json"), JSON.stringify({ contractVersion: "v3" }), "utf8");
      await materializeArtifactLayout({ outputDir: dir, layout: "tree" });

      const resolved = await resolveArtifactPath(dir, "agent-index");
      expect(resolved.replace(/\\/g, "/")).toMatch(/agent\/index\.json$/);
    });
  });

  it("resolveArtifactPath falls back to flat path", async () => {
    await withDir(async (dir) => {
      await mkdir(dir, { recursive: true });
      await writeFile(resolve(dir, "analyze.json"), JSON.stringify({ contractVersion: "v6", actions: [] }), "utf8");

      const resolved = await resolveArtifactPath(dir, "analyze");
      expect(resolved.replace(/\\/g, "/")).toMatch(/analyze\.json$/);
    });
  });

  it("finalizeArtifactLayout writes NAVIGATION.md in flat mode", async () => {
    await withDir(async (dir) => {
      await mkdir(dir, { recursive: true });
      await writeFile(resolve(dir, "agent-index.json"), JSON.stringify({ contractVersion: "v3" }), "utf8");

      await finalizeArtifactLayout({ outputDir: dir, layout: "flat" });

      const nav = await readFile(resolve(dir, "NAVIGATION.md"), "utf8");
      expect(nav).toContain("agent-index.json");
      expect(await readFile(resolve(dir, "manifest.json"), "utf8").catch(() => null)).toBeNull();
    });
  });
});
