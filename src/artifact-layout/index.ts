import { writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { buildFlatNavigationMarkdown } from "./flat-navigation.js";
import { resolveArtifactLayoutFromEnv } from "./layout-mode.js";
import { materializeArtifactLayout } from "./materialize.js";
import type { ArtifactLayoutMode } from "./types.js";

export type FinalizeArtifactLayoutParams = {
  readonly outputDir: string;
  readonly layout?: ArtifactLayoutMode;
};

/**
 * Materialize tree layout (when enabled) and refresh navigation files.
 */
export async function finalizeArtifactLayout(params: FinalizeArtifactLayoutParams): Promise<void> {
  const layout = params.layout ?? resolveArtifactLayoutFromEnv();
  if (layout === "flat") {
    console.warn(
      "signaler: --artifact-layout flat is deprecated; tree layout is the default. Flat root files will be removed in a future release.",
    );
    const md = await buildFlatNavigationMarkdown(params.outputDir);
    await writeFile(resolve(params.outputDir, "NAVIGATION.md"), md, "utf8");
    return;
  }

  await materializeArtifactLayout({ outputDir: params.outputDir, layout: "tree" });
}

export { resolveArtifactPath, resolveArtifactRelativePath, resolveFlatPathForId } from "./resolve.js";
export { parseArtifactLayoutMode, resolveArtifactLayoutFromEnv, resolveDefaultArtifactLayoutMode } from "./layout-mode.js";
export { materializeArtifactLayout } from "./materialize.js";
export type { ArtifactLayoutMode, ArtifactManifestV1, AgentEntrypointsV1 } from "./types.js";
