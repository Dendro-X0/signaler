import { readdir, readFile } from "node:fs/promises";
import type { Dirent } from "node:fs";
import { basename, join } from "node:path";
import { pathExists } from "./fs-utils.js";

export type ProjectFrameworkId = "next";

export interface DiscoveredProject {
  readonly name: string;
  readonly root: string;
  readonly framework: ProjectFrameworkId;
}

export interface DiscoverNextProjectsOptions {
  readonly repoRoot: string;
  readonly maxDepth?: number;
}

interface QueueItem {
  readonly path: string;
  readonly depth: number;
}

const DEFAULT_MAX_DEPTH = 3;
const IGNORED_DIRECTORIES: readonly string[] = [
  "node_modules",
  ".git",
  ".next",
  ".turbo",
  ".vercel",
  "dist",
  "build",
  "out",
  "coverage",
  ".cache",
];

/**
 * Discover Next.js projects below the given repository root.
 * This performs a shallow breadth-first search and looks for either
 * a next.config.* file or a package.json that depends on "next".
 */
export async function discoverNextProjects(options: DiscoverNextProjectsOptions): Promise<readonly DiscoveredProject[]> {
  const maxDepth: number = options.maxDepth ?? DEFAULT_MAX_DEPTH;
  const queue: QueueItem[] = [{ path: options.repoRoot, depth: 0 }];
  const visited = new Set<string>();
  const projects: DiscoveredProject[] = [];
  while (queue.length > 0) {
    const current: QueueItem = queue.shift() as QueueItem;
    if (visited.has(current.path)) {
      continue;
    }
    visited.add(current.path);
    if (await isNextProjectRoot(current.path)) {
      const name: string = basename(current.path) || ".";
      projects.push({ name, root: current.path, framework: "next" });
      continue;
    }
    if (current.depth >= maxDepth) {
      continue;
    }
    let entries: Dirent[];
    try {
      entries = await readdir(current.path, { withFileTypes: true });
    } catch {
      continue;
    }
    for (const entry of entries) {
      if (!entry.isDirectory()) {
        continue;
      }
      if (IGNORED_DIRECTORIES.includes(entry.name)) {
        continue;
      }
      const childPath: string = join(current.path, entry.name);
      queue.push({ path: childPath, depth: current.depth + 1 });
    }
  }
  return projects;
}

async function isNextProjectRoot(directory: string): Promise<boolean> {
  const nextConfigCandidates: readonly string[] = [
    "next.config.js",
    "next.config.mjs",
    "next.config.cjs",
    "next.config.ts",
  ];
  for (const candidate of nextConfigCandidates) {
    const configPath: string = join(directory, candidate);
    if (await pathExists(configPath)) {
      return true;
    }
  }
  const packageJsonPath: string = join(directory, "package.json");
  if (!(await pathExists(packageJsonPath))) {
    return false;
  }
  try {
    const raw: string = await readFile(packageJsonPath, "utf8");
    const parsed: unknown = JSON.parse(raw) as unknown;
    if (!parsed || typeof parsed !== "object") {
      return false;
    }
    const maybePackage = parsed as {
      readonly dependencies?: Record<string, unknown>;
      readonly devDependencies?: Record<string, unknown>;
    };
    const hasNextDependency: boolean = Boolean(
      (maybePackage.dependencies && typeof maybePackage.dependencies.next === "string") ||
        (maybePackage.devDependencies && typeof maybePackage.devDependencies.next === "string"),
    );
    return hasNextDependency;
  } catch {
    return false;
  }
}
