import { existsSync } from "node:fs";
import { spawn, spawnSync, type ChildProcess } from "node:child_process";
import { join } from "node:path";
import {
  buildLoopbackBaseUrl,
  findAvailablePort,
  hasFreshProductionBuild,
  isPortAvailable,
  normalizeLoopbackBaseUrl,
  parseBaseUrlPort,
  resolveProductionServePlan,
  type PackageManagerId,
  type ProductionServePlan,
} from "./resolve-serve-plan.js";
import { formatManagedServePortConflict, formatManagedServeStartTimeout } from "./managed-serve-diagnostics.js";
import { probeUrl, probeUrlListening, probeUrlReachable, waitForUrlReachable } from "./url-probe.js";

export type ManagedProductionServerOptions = {
  readonly projectRoot: string;
  readonly baseUrl?: string;
  readonly skipBuild?: boolean;
  readonly reuseUnhealthy?: boolean;
  readonly buildTimeoutMs?: number;
  readonly startTimeoutMs?: number;
  /** Merged into the managed `start` child process only (not written to project .env). */
  readonly serveEnv?: Readonly<Record<string, string>>;
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

function runPackageScript(params: {
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

function runNextWebpackBuild(params: {
  readonly cwd: string;
  readonly packageManager: PackageManagerId;
  readonly timeoutMs: number;
}): void {
  const command = packageManagerCommand(params.packageManager);
  const appPackageManager = params.packageManager;
  const result = spawnSync(command, ["exec", "next", "build", "--webpack"], {
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
    throw new Error(
      formatProductionBuildFailureMessage({
        exitCode: result.status ?? 1,
        webpackAttempted: true,
        packageManager: appPackageManager,
      }),
    );
  }
}

function runProductionBuild(plan: ProductionServePlan, timeoutMs: number): void {
  try {
    runPackageScript({
      cwd: plan.projectRoot,
      packageManager: plan.packageManager,
      script: plan.buildScript,
      timeoutMs,
    });
  } catch (primaryError) {
    // eslint-disable-next-line no-console
    console.log(
      `Managed serve: primary build failed in ${plan.projectRoot}; retrying with next build --webpack in ${plan.nextAppRoot} ...`,
    );
    try {
      runNextWebpackBuild({
        cwd: plan.nextAppRoot,
        packageManager: detectPackageManagerForRoot(plan.nextAppRoot, plan.packageManager),
        timeoutMs,
      });
    } catch (fallbackError) {
      const primaryMessage = primaryError instanceof Error ? primaryError.message : String(primaryError);
      const fallbackMessage = fallbackError instanceof Error ? fallbackError.message : String(fallbackError);
      throw new Error(`${primaryMessage}\n\nWebpack fallback also failed:\n${fallbackMessage}`);
    }
  }
}

function detectPackageManagerForRoot(directory: string, fallback: PackageManagerId): PackageManagerId {
  if (existsSync(join(directory, "pnpm-lock.yaml"))) {
    return "pnpm";
  }
  if (existsSync(join(directory, "yarn.lock"))) {
    return "yarn";
  }
  if (existsSync(join(directory, "package-lock.json"))) {
    return "npm";
  }
  return fallback;
}

function formatProductionBuildFailureMessage(params: {
  readonly exitCode: number;
  readonly webpackAttempted?: boolean;
  readonly packageManager?: PackageManagerId;
}): string {
  const lines: string[] = [
    `Production build failed with exit code ${params.exitCode}.`,
    "",
    "Common fixes (Next.js 16 + pnpm):",
    "  - Run: next build --webpack  (Turbopack may not resolve pnpm deps)",
    "  - Set turbopack.root to the app directory in next.config",
    "  - For pnpm: shamefully-hoist=true in .npmrc or install missing @radix-ui peers",
    "  - Build manually: pnpm run build && signaler run --managed-serve-skip-build ...",
  ];
  if (params.webpackAttempted) {
    lines.push("", "Signaler already retried with `next build --webpack`.");
  } else {
    lines.push("", "Signaler will retry automatically with `next build --webpack` when possible.");
  }
  return lines.join("\n");
}

function spawnStartProcess(params: {
  readonly cwd: string;
  readonly packageManager: PackageManagerId;
  readonly script: string;
  readonly port: number;
  readonly serveEnv?: Readonly<Record<string, string>>;
}): ChildProcess {
  const command = packageManagerCommand(params.packageManager);
  return spawn(command, ["run", params.script], {
    cwd: params.cwd,
    stdio: "ignore",
    env: {
      ...process.env,
      ...params.serveEnv,
      PORT: String(params.port),
      HOSTNAME: "127.0.0.1",
      HOST: "127.0.0.1",
    },
    shell: process.platform === "win32",
    detached: process.platform !== "win32",
  });
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

  if (options.reuseUnhealthy && (await probeUrlListening(healthUrl))) {
    const probe = await probeUrl({ url: healthUrl });
    // eslint-disable-next-line no-console
    console.warn(
      `Managed serve: reusing server at ${baseUrl} (HTTP ${probe.statusCode ?? "?"}; not healthy). Audits may reflect a broken app.`,
    );
    return {
      baseUrl,
      startedBySignaler: false,
      builtBySignaler: false,
      stop: async () => {},
    };
  }

  const preferredPort = parseBaseUrlPort(requestedBaseUrl);
  if (!(await isPortAvailable(preferredPort)) && !(await probeUrlReachable(healthUrl))) {
    throw new Error(formatManagedServePortConflict({ port: preferredPort, baseUrl }));
  }
  const port = await findAvailablePort(preferredPort);
  if (port !== preferredPort) {
    // eslint-disable-next-line no-console
    console.log(`Managed serve: port ${preferredPort} unavailable; using ${port} instead.`);
    baseUrl = buildLoopbackBaseUrl(port);
    healthUrl = `${baseUrl}/`;
  }

  let builtBySignaler = false;
  if (!(await hasFreshProductionBuild({ nextAppRoot: plan.nextAppRoot, skipBuild: options.skipBuild }))) {
    // eslint-disable-next-line no-console
    console.log(`Managed serve: building production bundle in ${plan.projectRoot} (app: ${plan.nextAppRoot}) ...`);
    runProductionBuild(plan, options.buildTimeoutMs ?? 900_000);
    builtBySignaler = true;
  } else {
    // eslint-disable-next-line no-console
    console.log(`Managed serve: reusing existing production build in ${plan.nextAppRoot}.`);
  }

  // eslint-disable-next-line no-console
  console.log(`Managed serve: starting production server at ${baseUrl} ...`);
  if (options.serveEnv && Object.keys(options.serveEnv).length > 0) {
    const keys = Object.keys(options.serveEnv).join(", ");
    // eslint-disable-next-line no-console
    console.log(`Managed serve: audit lab env on start process only (${keys}) — production build unchanged.`);
  }
  const child = spawnStartProcess({
    cwd: plan.projectRoot,
    packageManager: plan.packageManager,
    script: plan.startScript,
    port,
    serveEnv: options.serveEnv,
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
    throw new Error(
      formatManagedServeStartTimeout({
        mode: "production",
        baseUrl,
        timeoutMs: options.startTimeoutMs ?? 120_000,
        requestedProjectRoot: options.projectRoot,
        resolvedProjectRoot: plan.projectRoot,
        script: `${plan.packageManager} run ${plan.startScript}`,
        cause: error,
      }),
    );
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
