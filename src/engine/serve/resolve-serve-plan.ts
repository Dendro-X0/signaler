import { createServer } from "node:net";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { discoverNextProjects } from "../../project-discovery.js";
import { pathExists } from "../../infrastructure/filesystem/utils.js";

export type PackageManagerId = "pnpm" | "npm" | "yarn";

export type ProductionServePlan = {
  readonly projectRoot: string;
  readonly packageManager: PackageManagerId;
  readonly buildScript: string;
  readonly startScript: string;
};

type PackageJsonScripts = {
  readonly build?: string;
  readonly start?: string;
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
      return {
        projectRoot: root,
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
