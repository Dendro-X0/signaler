import { mkdir, rm, writeFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import { resolve } from "node:path";
import { tmpdir } from "node:os";
import { afterEach, describe, expect, it } from "vitest";
import { materializeArtifactLayout } from "../src/artifact-layout/materialize.js";

describe("materializeArtifactLayout", () => {
  let outputDir: string;

  afterEach(async () => {
    if (outputDir) {
      await rm(outputDir, { recursive: true, force: true });
    }
  });

  it("merges existing tree artifacts when only analyze.json is written later", async () => {
    outputDir = resolve(tmpdir(), `signaler-materialize-${Date.now()}`);
    await mkdir(outputDir, { recursive: true });
    await writeFile(resolve(outputDir, "agent-index.json"), '{"contractVersion":"v3"}\n', "utf8");
    await writeFile(resolve(outputDir, "performance-triage.json"), '{"contractVersion":"v3"}\n', "utf8");

    await materializeArtifactLayout({ outputDir, layout: "tree" });
    expect(existsSync(resolve(outputDir, "agent/performance-triage.json"))).toBe(true);

    await writeFile(resolve(outputDir, "analyze.json"), '{"schemaVersion":1}\n', "utf8");
    await materializeArtifactLayout({ outputDir, layout: "tree" });

    const entrypointsRaw = await import("node:fs/promises").then((fs) =>
      fs.readFile(resolve(outputDir, "agent/entrypoints.json"), "utf8"),
    );
    const entrypoints = JSON.parse(entrypointsRaw) as { readOrder: Array<{ id: string }> };
    const ids = entrypoints.readOrder.map((entry) => entry.id);
    expect(ids).toContain("performance-triage");
    expect(ids).toContain("analyze");
    expect(ids).toContain("agent-index");
  });
});
