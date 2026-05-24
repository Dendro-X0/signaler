import { spawn, spawnSync, type ChildProcess } from "node:child_process";
import { join } from "node:path";
import { pathExists } from "../../infrastructure/filesystem/utils.js";
import {
  buildLoopbackBaseUrl,
  findAvailablePort,
  normalizeLoopbackBaseUrl,
  parseBaseUrlPort,
  resolveProductionServePlan,
  type PackageManagerId,
} from "./resolve-serve-plan.js";
import { probeUrlReachable, waitForUrlReachable } from "./url-probe.js";

export type ManagedProductionServerOptions = {
  readonly projectRoot: string;
  readonly baseUrl?: string;
  readonly skipBuild?: boolean;
  readonly buildTimeoutMs?: number;
  readonly startTimeoutMs?: number;
};

export type ManagedProductionServerHandle = {
  readonly baseUrl: string;
  readonly startedBySignaler: boolean;
  readonly builtBySignaler: boolean;
  readonly stop: () => Promise<void>;
};

let registeredShutdown = false;
const activeHandles = new Set<ManagedProductionServerHandle>();

function registerProcessShutdown(): void {
  if (registeredShutdown) {
    return;
  }
  registeredShutdown = true;
  const shutdown = (): void => {
    for (const handle of activeHandles) {
      void handle.stop();
    }
  };
  process.on("SIGINT", shutdown);
  process.on("SIGTERM", shutdown);
  process.on("exit", shutdown);
}

function packageManagerCommand(packageManager: PackageManagerId): string {
  if (packageManager === "pnpm") {
    return process.platform === "win32" ? "pnpm.cmd" : "pnpm";
  }
  if (packageManager === "yarn") {
    return process.platform === "win32" ? "yarn.cmd" : "yarn";
  }
  return process.platform === "win32" ? "npm.cmd" : "npm";
}

function runBuild(params: {
  readonly cwd: string;
  readonly packageManager: PackageManagerId;
  readonly script: string;
  readonly timeoutMs: number;
}): void {
  const command = packageManagerCommand(params.packageManager);
  const result = spawnSync(command, ["run", params.script], {
    cwd: params.cwd,
    stdio: "inherit",
    env: process.env,
    shell: process.platform === "win32",
    timeout: params.timeoutMs,
  });
  if (result.error) {
    throw result.error;
  }
  if (result.status !== 0) {
    throw new Error(formatProductionBuildFailureMessage({ exitCode: result.status ?? 1 }));
  }
}

function formatProductionBuildFailureMessage(params: { readonly exitCode: number }): string {
  const lines: string[] = [
    `Production build failed with exit code ${params.exitCode}.`,
    "",
    "Common fixes (Next.js 16 + pnpm):",
    "  - Run: next build --webpack  (Turbopack may not resolve pnpm deps)",
    "  - Set turbopack.root to the app directory in next.config",
    "  - For pnpm: shamefully-hoist=true in .npmrc or install missing @radix-ui peers",
    "  - Build manually: pnpm run build && signaler run --managed-serve-skip-build ...",
  ];
  return lines.join("\n");
}

function spawnStartProcess(params: {
  readonly cwd: string;
  readonly packageManager: PackageManagerId;
  readonly script: string;
  readonly port: number;
}): ChildProcess {
  const command = packageManagerCommand(params.packageManager);
  return spawn(command, ["run", params.script], {
    cwd: params.cwd,
    stdio: "ignore",
    env: {
      ...process.env,
      PORT: String(params.port),
      HOSTNAME: "127.0.0.1",
      HOST: "127.0.0.1",
    },
    shell: process.platform === "win32",
    detached: process.platform !== "win32",
  });
}

async function shouldSkipBuild(projectRoot: string, skipBuild?: boolean): Promise<boolean> {
  if (skipBuild) {
    return true;
  }
  return pathExists(join(projectRoot, ".next", "BUILD_ID"));
}

/**
 * Ensure a production-like server is reachable. Starts `build` + `start` when needed and
 * stops the child on cleanup (audit completion or CLI termination).
 */
export async function ensureManagedProductionServer(
  options: ManagedProductionServerOptions,
): Promise<ManagedProductionServerHandle> {
  registerProcessShutdown();
  const plan = await resolveProductionServePlan({ projectRoot: options.projectRoot });
  const requestedBaseUrl = normalizeLoopbackBaseUrl(options.baseUrl ?? "http://127.0.0.1:3000");
  let baseUrl = requestedBaseUrl;
  let healthUrl = `${baseUrl}/`;

  if (await probeUrlReachable(healthUrl)) {
    return {
      baseUrl,
      startedBySignaler: false,
      builtBySignaler: false,
      stop: async () => {},
    };
  }

  const preferredPort = parseBaseUrlPort(requestedBaseUrl);
  const port = await findAvailablePort(preferredPort);
  if (port !== preferredPort) {
    console.log(`Managed serve: port ${preferredPort} unavailable; using ${port} instead.`);
    baseUrl = buildLoopbackBaseUrl(port);
    healthUrl = `${baseUrl}/`;
  }

  let builtBySignaler = false;
  if (!(await shouldSkipBuild(plan.projectRoot, options.skipBuild))) {
    console.log(`Managed serve: building production bundle in ${plan.projectRoot} ...`);
    runBuild({
      cwd: plan.projectRoot,
      packageManager: plan.packageManager,
      script: plan.buildScript,
      timeoutMs: options.buildTimeoutMs ?? 900_000,
    });
    builtBySignaler = true;
  } else {
    console.log(`Managed serve: reusing existing production build in ${plan.projectRoot}.`);
  }

  console.log(`Managed serve: starting production server at ${baseUrl} ...`);
  const child = spawnStartProcess({
    cwd: plan.projectRoot,
    packageManager: plan.packageManager,
    script: plan.startScript,
    port,
  });

  if (!child.pid) {
    throw new Error("Failed to start production server process.");
  }

  try {
    await waitForUrlReachable({
      url: healthUrl,
      timeoutMs: options.startTimeoutMs ?? 120_000,
    });
  } catch (error) {
    await stopChildProcess(child);
    throw error;
  }

  const handle: ManagedProductionServerHandle = {
    baseUrl,
    startedBySignaler: true,
    builtBySignaler,
    stop: async () => {
      activeHandles.delete(handle);
      await stopChildProcess(child);
    },
  };
  activeHandles.add(handle);
  return handle;
}

async function stopChildProcess(child: ChildProcess): Promise<void> {
  if (child.killed || child.exitCode !== null) {
    return;
  }
  if (process.platform === "win32" && child.pid) {
    spawnSync("taskkill", ["/pid", String(child.pid), "/T", "/F"], { stdio: "ignore", shell: true });
    return;
  }
  if (child.pid && process.platform !== "win32") {
    try {
      process.kill(-child.pid, "SIGTERM");
      return;
    } catch {
      // fall through
    }
  }
  child.kill("SIGTERM");
}
