import { createServer } from "node:net";
import { readFile, stat } from "node:fs/promises";
import { join } from "node:path";
import { discoverNextProjects } from "../../project-discovery.js";
import { pathExists } from "../../infrastructure/filesystem/utils.js";

export type PackageManagerId = "pnpm" | "npm" | "yarn";

export type ProductionServePlan = {
  /** Directory where `pnpm run build` / `start` execute (monorepo root or app root). */
  readonly projectRoot: string;
  /** Next.js app directory where `.next/` is written (may differ in monorepos). */
  readonly nextAppRoot: string;
  readonly packageManager: PackageManagerId;
  readonly buildScript: string;
  readonly startScript: string;
};

export type DevServePlan = {
  readonly projectRoot: string;
  readonly packageManager: PackageManagerId;
  readonly devScript: string;
};

type PackageJsonScripts = {
  readonly build?: string;
  readonly start?: string;
  readonly dev?: string;
};

async function detectPackageManager(projectRoot: string): Promise<PackageManagerId> {
  if (await pathExists(join(projectRoot, "pnpm-lock.yaml"))) {
    return "pnpm";
  }
  if (await pathExists(join(projectRoot, "yarn.lock"))) {
    return "yarn";
  }
  return "npm";
}

async function readScripts(projectRoot: string): Promise<PackageJsonScripts> {
  const raw = await readFile(join(projectRoot, "package.json"), "utf8");
  const parsed = JSON.parse(raw) as { readonly scripts?: PackageJsonScripts };
  return parsed.scripts ?? {};
}

async function hasNextConfigAt(root: string): Promise<boolean> {
  return (
    (await pathExists(join(root, "next.config.ts")))
    || (await pathExists(join(root, "next.config.js")))
    || (await pathExists(join(root, "next.config.mjs")))
  );
}

/**
 * Resolve the Next.js app directory (where `.next/` lives). For monorepos this is
 * often `apps/web` while build scripts run from the repository root.
 */
export async function resolveNextAppRoot(projectRoot: string): Promise<string> {
  if (await hasNextConfigAt(projectRoot)) {
    return projectRoot;
  }
  const discovered = await discoverNextProjects({ repoRoot: projectRoot, maxDepth: 4 });
  if (discovered.length === 0) {
    return projectRoot;
  }
  const normalizedRoot = projectRoot.replace(/\\/g, "/").toLowerCase();
  const webApp = discovered.find((project) => {
    const normalized = project.root.replace(/\\/g, "/").toLowerCase();
    return project.name === "web" || normalized.endsWith("/apps/web");
  });
  if (webApp) {
    return webApp.root;
  }
  const outsideRoot = discovered
    .filter((project) => project.root.replace(/\\/g, "/").toLowerCase() !== normalizedRoot)
    .sort((a, b) => a.root.length - b.root.length);
  return outsideRoot[0]?.root ?? discovered[0]!.root;
}

/**
 * True when a production build output exists and package.json has not changed since BUILD_ID.
 */
export async function hasFreshProductionBuild(params: {
  readonly nextAppRoot: string;
  readonly skipBuild?: boolean;
}): Promise<boolean> {
  if (params.skipBuild) {
    return true;
  }
  const buildIdPath = join(params.nextAppRoot, ".next", "BUILD_ID");
  if (!(await pathExists(buildIdPath))) {
    return false;
  }
  const packageJsonPath = join(params.nextAppRoot, "package.json");
  if (!(await pathExists(packageJsonPath))) {
    return true;
  }
  const [buildStat, packageStat] = await Promise.all([stat(buildIdPath), stat(packageJsonPath)]);
  return packageStat.mtimeMs <= buildStat.mtimeMs;
}

/**
 * Resolve how to build and start a production-like server for the target project.
 */
export async function resolveProductionServePlan(params: {
  readonly projectRoot: string;
}): Promise<ProductionServePlan> {
  const rootsToTry = [params.projectRoot];
  const scripts = await readScripts(params.projectRoot);
  if (!scripts.build || !scripts.start) {
    const discovered = await discoverNextProjects({ repoRoot: params.projectRoot, maxDepth: 4 });
    for (const project of discovered) {
      if (project.root === params.projectRoot) {
        continue;
      }
      rootsToTry.push(project.root);
    }
  }

  for (const root of rootsToTry) {
    const candidateScripts = root === params.projectRoot ? scripts : await readScripts(root);
    if (candidateScripts.build && candidateScripts.start) {
      const nextAppRoot = await resolveNextAppRoot(root);
      return {
        projectRoot: root,
        nextAppRoot,
        packageManager: await detectPackageManager(root),
        buildScript: "build",
        startScript: "start",
      };
    }
  }

  throw new Error(
    `No production serve plan found under ${params.projectRoot}. Expected package.json scripts "build" and "start".`,
  );
}

/**
 * Resolve how to start a dev server (`pnpm run dev`, etc.) for the target project.
 */
export async function resolveDevServePlan(params: {
  readonly projectRoot: string;
}): Promise<DevServePlan> {
  const rootsToTry = [params.projectRoot];
  const scripts = await readScripts(params.projectRoot);
  if (!scripts.dev) {
    const discovered = await discoverNextProjects({ repoRoot: params.projectRoot, maxDepth: 4 });
    for (const project of discovered) {
      if (project.root === params.projectRoot) {
        continue;
      }
      rootsToTry.push(project.root);
    }
  }

  for (const root of rootsToTry) {
    const candidateScripts = root === params.projectRoot ? scripts : await readScripts(root);
    if (candidateScripts.dev) {
      return {
        projectRoot: root,
        packageManager: await detectPackageManager(root),
        devScript: "dev",
      };
    }
  }

  throw new Error(
    `No dev serve plan found under ${params.projectRoot}. Expected package.json script "dev".`,
  );
}

export function parseBaseUrlPort(baseUrl: string, fallbackPort = 3000): number {
  try {
    const parsed = new URL(baseUrl);
    if (parsed.port) {
      return Number.parseInt(parsed.port, 10);
    }
    return parsed.protocol === "https:" ? 443 : fallbackPort;
  } catch {
    return fallbackPort;
  }
}

export function normalizeLoopbackBaseUrl(baseUrl: string): string {
  const parsed = new URL(baseUrl);
  parsed.hostname = "127.0.0.1";
  return parsed.toString().replace(/\/$/, "");
}

export async function isPortAvailable(port: number, host = "127.0.0.1"): Promise<boolean> {
  return new Promise((resolve) => {
    const server = createServer();
    server.once("error", () => resolve(false));
    server.listen(port, host, () => {
      server.close(() => resolve(true));
    });
  });
}

export async function findAvailablePort(preferredPort?: number): Promise<number> {
  if (typeof preferredPort === "number" && preferredPort > 0 && (await isPortAvailable(preferredPort))) {
    return preferredPort;
  }
  return new Promise((resolve, reject) => {
    const server = createServer();
    server.once("error", reject);
    server.listen(0, "127.0.0.1", () => {
      const address = server.address();
      const port = typeof address === "object" && address ? address.port : 0;
      server.close((error) => {
        if (error) {
          reject(error);
          return;
        }
        resolve(port);
      });
    });
  });
}

export function buildLoopbackBaseUrl(port: number): string {
  return `http://127.0.0.1:${port}`;
}
