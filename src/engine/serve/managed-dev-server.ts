import {
  buildLoopbackBaseUrl,
  findAvailablePort,
  normalizeLoopbackBaseUrl,
  parseBaseUrlPort,
  resolveDevServePlan,
} from "./resolve-serve-plan.js";
import {
  registerManagedServeShutdown,
  spawnPackageScriptProcess,
  stopManagedServeChild,
} from "./managed-serve-lifecycle.js";
import { formatManagedServeStartTimeout } from "./managed-serve-diagnostics.js";
import { probeUrl, probeUrlListening, probeUrlReachable, waitForUrlReachable } from "./url-probe.js";

export type ManagedDevServerOptions = {
  readonly projectRoot: string;
  readonly baseUrl?: string;
  readonly reuseUnhealthy?: boolean;
  readonly startTimeoutMs?: number;
};

export type ManagedDevServerHandle = {
  readonly baseUrl: string;
  readonly startedBySignaler: boolean;
  readonly mode: "dev";
  readonly stop: () => Promise<void>;
};

const activeHandles = new Set<ManagedDevServerHandle>();

export async function ensureManagedDevServer(
  options: ManagedDevServerOptions,
): Promise<ManagedDevServerHandle> {
  registerManagedServeShutdown();
  const plan = await resolveDevServePlan({ projectRoot: options.projectRoot });
  const requestedBaseUrl = normalizeLoopbackBaseUrl(options.baseUrl ?? "http://127.0.0.1:3000");
  let baseUrl = requestedBaseUrl;
  let healthUrl = `${baseUrl}/`;

  if (await probeUrlReachable(healthUrl)) {
    return {
      baseUrl,
      startedBySignaler: false,
      mode: "dev",
      stop: async () => {},
    };
  }

  if (options.reuseUnhealthy && (await probeUrlListening(healthUrl))) {
    const probe = await probeUrl({ url: healthUrl });
    // eslint-disable-next-line no-console
    console.warn(
      `Managed serve (dev): reusing server at ${baseUrl} (HTTP ${probe.statusCode ?? "?"}; not healthy).`,
    );
    return {
      baseUrl,
      startedBySignaler: false,
      mode: "dev",
      stop: async () => {},
    };
  }

  const preferredPort = parseBaseUrlPort(requestedBaseUrl);
  const port = await findAvailablePort(preferredPort);
  if (port !== preferredPort) {
    // eslint-disable-next-line no-console
    console.log(`Managed serve (dev): port ${preferredPort} unavailable; using ${port} instead.`);
    baseUrl = buildLoopbackBaseUrl(port);
    healthUrl = `${baseUrl}/`;
  }

  // eslint-disable-next-line no-console
  console.log(`Managed serve (dev): starting \`${plan.devScript}\` in ${plan.projectRoot} at ${baseUrl} ...`);
  const child = spawnPackageScriptProcess({
    cwd: plan.projectRoot,
    packageManager: plan.packageManager,
    script: plan.devScript,
    port,
  });

  if (!child.pid) {
    throw new Error("Failed to start dev server process.");
  }

  try {
    await waitForUrlReachable({
      url: healthUrl,
      timeoutMs: options.startTimeoutMs ?? 180_000,
    });
  } catch (error) {
    await stopManagedServeChild(child);
    throw new Error(
      formatManagedServeStartTimeout({
        mode: "dev",
        baseUrl,
        timeoutMs: options.startTimeoutMs ?? 180_000,
        requestedProjectRoot: options.projectRoot,
        resolvedProjectRoot: plan.projectRoot,
        script: `${plan.packageManager} run ${plan.devScript}`,
        cause: error,
      }),
    );
  }

  const handle: ManagedDevServerHandle = {
    baseUrl,
    startedBySignaler: true,
    mode: "dev",
    stop: async () => {
      activeHandles.delete(handle);
      await stopManagedServeChild(child);
    },
  };
  activeHandles.add(handle);
  return handle;
}
