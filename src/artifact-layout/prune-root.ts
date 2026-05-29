import { mkdir, readdir, rename, rm, unlink } from "node:fs/promises";
import { existsSync } from "node:fs";
import { resolve } from "node:path";
import { ARTIFACT_DIRECTORY_RULES } from "./registry.js";
import type { ManifestArtifactEntry } from "./types.js";

/** Root files kept after tree materialize + prune. */
const ROOT_KEEP_FILES = new Set(["manifest.json", "INDEX.md", "NAVIGATION.md"]);

/** Top-level dirs produced by tree layout (plus archive for overflow). */
const TREE_ROOT_DIRS = new Set([
  "agent",
  "developer",
  "runs",
  "runners",
  "orchestration",
  "gates",
  "export",
  "archive",
]);

export type PruneRootResult = {
  readonly removedFiles: number;
  readonly removedDirs: number;
  readonly archivedFiles: number;
};

async function removeFileIfExists(path: string): Promise<boolean> {
  if (!existsSync(path)) {
    return false;
  }
  await unlink(path);
  return true;
}

async function removeDirIfExists(path: string): Promise<boolean> {
  if (!existsSync(path)) {
    return false;
  }
  await rm(path, { recursive: true, force: true });
  return true;
}

/**
 * Remove flat legacy copies at `.signaler/` root after tree paths exist.
 * Unmapped root files are moved under `archive/` so the root stays navigable.
 */
export async function pruneFlatRootArtifacts(params: {
  readonly outputDir: string;
  readonly materialized: readonly ManifestArtifactEntry[];
}): Promise<PruneRootResult> {
  const root = resolve(params.outputDir);
  let removedFiles = 0;
  let removedDirs = 0;
  let archivedFiles = 0;

  for (const entry of params.materialized) {
    const legacyPath = entry.legacyPath;
    if (!legacyPath) {
      continue;
    }
    const flatAbs = resolve(root, legacyPath);
    const treeAbs = resolve(root, entry.path);
    if (!existsSync(treeAbs)) {
      continue;
    }
    if (await removeFileIfExists(flatAbs)) {
      removedFiles += 1;
    }
  }

  for (const dirRule of ARTIFACT_DIRECTORY_RULES) {
    const flatDir = resolve(root, dirRule.flatDir);
    const treeDir = resolve(root, dirRule.treeDir);
    if (!existsSync(treeDir)) {
      continue;
    }
    if (await removeDirIfExists(flatDir)) {
      removedDirs += 1;
    }
  }

  const archiveDir = resolve(root, "archive");
  await mkdir(archiveDir, { recursive: true });

  const entries = await readdir(root, { withFileTypes: true });
  for (const entry of entries) {
    if (entry.isDirectory()) {
      if (TREE_ROOT_DIRS.has(entry.name)) {
        continue;
      }
      const from = resolve(root, entry.name);
      const to = resolve(archiveDir, entry.name);
      if (!existsSync(from)) {
        continue;
      }
      if (existsSync(to)) {
        await rm(from, { recursive: true, force: true });
      } else {
        await rename(from, to);
      }
      removedDirs += 1;
      continue;
    }
    if (!entry.isFile()) {
      continue;
    }
    if (ROOT_KEEP_FILES.has(entry.name)) {
      continue;
    }
    const from = resolve(root, entry.name);
    const to = resolve(archiveDir, entry.name);
    if (!existsSync(from)) {
      continue;
    }
    if (existsSync(to)) {
      await unlink(from);
    } else {
      await rename(from, to);
    }
    archivedFiles += 1;
  }

  return { removedFiles, removedDirs, archivedFiles };
}
