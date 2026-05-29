import { existsSync } from "node:fs";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { findArtifactRule, flatPathForId, treePathForId } from "./registry.js";
import type { ArtifactManifestV1 } from "./types.js";

async function readManifest(outputDir: string): Promise<ArtifactManifestV1 | undefined> {
  try {
    const raw = await readFile(resolve(outputDir, "manifest.json"), "utf8");
    const parsed = JSON.parse(raw) as unknown;
    if (
      typeof parsed === "object"
      && parsed !== null
      && (parsed as ArtifactManifestV1).schemaVersion === 1
      && Array.isArray((parsed as ArtifactManifestV1).artifacts)
    ) {
      return parsed as ArtifactManifestV1;
    }
  } catch {
    // no manifest
  }
  return undefined;
}

/**
 * Resolve the best on-disk path for a known artifact id.
 * Order: manifest canonical path → tree path if present → flat legacy path.
 */
export async function resolveArtifactPath(outputDir: string, id: string): Promise<string> {
  const root = resolve(outputDir);
  const manifest = await readManifest(root);
  const fromManifest = manifest?.artifacts.find((entry) => entry.id === id);
  if (fromManifest) {
    const canonical = resolve(root, fromManifest.path);
    if (existsSync(canonical)) {
      return canonical;
    }
    if (fromManifest.legacyPath) {
      const legacy = resolve(root, fromManifest.legacyPath);
      if (existsSync(legacy)) {
        return legacy;
      }
    }
  }

  const treeRel = treePathForId(id);
  if (treeRel) {
    const treeAbs = resolve(root, treeRel);
    if (existsSync(treeAbs)) {
      return treeAbs;
    }
  }

  const flatRel = flatPathForId(id) ?? `${id}.json`;
  return resolve(root, flatRel);
}

export async function resolveArtifactRelativePath(outputDir: string, id: string): Promise<string> {
  const abs = await resolveArtifactPath(outputDir, id);
  const rel = abs.slice(resolve(outputDir).length).replace(/^[/\\]+/, "");
  return rel.replace(/\\/g, "/");
}

export function resolveFlatPathForId(id: string): string {
  const rule = findArtifactRule(id);
  return rule?.flatPath ?? `${id}.json`;
}
