import { finalizeArtifactLayout } from "./artifact-layout/index.js";
import type { ArtifactLayoutMode } from "./artifact-layout/index.js";

type WriteArtifactsNavigationParams = {
  readonly outputDir: string;
  readonly layout?: ArtifactLayoutMode;
};

/**
 * Generate navigation index files into the artifacts output directory.
 * Tree layout (default): INDEX.md + manifest.json + categorized copies.
 * Flat layout: legacy NAVIGATION.md file listing.
 */
export async function writeArtifactsNavigation(params: WriteArtifactsNavigationParams): Promise<{ readonly absolutePath: string }> {
  await finalizeArtifactLayout(params);
  const layout = params.layout ?? "tree";
  const absolutePath = layout === "tree"
    ? `${params.outputDir.replace(/\\/g, "/")}/INDEX.md`
    : `${params.outputDir.replace(/\\/g, "/")}/NAVIGATION.md`;
  return { absolutePath };
}
