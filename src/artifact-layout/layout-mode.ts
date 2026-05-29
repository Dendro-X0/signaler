import type { ArtifactLayoutMode } from "./types.js";

export function parseArtifactLayoutMode(raw: string | undefined): ArtifactLayoutMode {
  const normalized = raw?.trim().toLowerCase();
  if (normalized === undefined || normalized.length === 0) {
    return resolveDefaultArtifactLayoutMode();
  }
  if (normalized === "flat" || normalized === "tree") {
    return normalized;
  }
  throw new Error(`Invalid artifact layout: ${raw}. Expected flat or tree.`);
}

export function resolveArtifactLayoutFromEnv(): ArtifactLayoutMode {
  const raw = process.env.SIGNALER_ARTIFACT_LAYOUT?.trim();
  if (!raw) {
    return resolveDefaultArtifactLayoutMode();
  }
  return parseArtifactLayoutMode(raw);
}

/** v4.5 default: tree layout when materializing outputs. */
export function resolveDefaultArtifactLayoutMode(): ArtifactLayoutMode {
  return "tree";
}
