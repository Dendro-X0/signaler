import { mkdir, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { runAuditCli } from "./cli.js";
import { resolveEngineJsonMode } from "./engine-json.js";
import type { EngineEventPayload } from "./engine-events-schema.js";
import { emitEngineEvent } from "./engine-events.js";
import { resolveOutputDir } from "./output-dir.js";
import { startStaticServer } from "./start-static-server.js";
import type { ApexConfig, ApexDevice, ApexPageConfig } from "./types.js";
import { detectRoutes } from "./route-detectors.js";
import { pathExists } from "./fs-utils.js";
import { runBundleCli } from "./bundle-cli.js";

type FolderArgs = {
  readonly rootDir: string;
  readonly routeCap: number;
  readonly bundleOnly: boolean;
};

const DEFAULT_ROUTE_CAP: number = 50;
const MAX_ROUTE_CAP: number = 500;
const DEFAULT_COMBO_CAP: number = 200;
const DEFAULT_DEVICES: readonly ApexDevice[] = ["mobile", "desktop"];

function parseFolderArgs(argv: readonly string[]): FolderArgs {
  let rootDir: string | undefined;
  let routeCap: number = DEFAULT_ROUTE_CAP;
  let bundleOnly = false;
  for (let i: number = 2; i < argv.length; i += 1) {
    const arg: string = argv[i] ?? "";
    if (arg === "--root" && i + 1 < argv.length) {
      rootDir = argv[i + 1] ?? rootDir;
      i += 1;
      continue;
    }
    if (arg === "--bundle-only") {
      bundleOnly = true;
      continue;
    }
    if (arg === "--route-cap" && i + 1 < argv.length) {
      const next: number = parseInt(argv[i + 1] ?? "", 10);
      if (Number.isFinite(next) && next > 0 && next <= MAX_ROUTE_CAP) {
        routeCap = next;
      }
      i += 1;
      continue;
    }
  }
  if (!rootDir) {
    throw new Error("Missing required --root <dir>");
  }
  return { rootDir: resolve(rootDir), routeCap, bundleOnly };
}

function toPages(routes: readonly { readonly path: string; readonly label: string }[]): readonly ApexPageConfig[] {
  return routes.map((r) => ({ path: r.path, label: r.label, devices: DEFAULT_DEVICES }));
}

export async function runFolderCli(argv: readonly string[]): Promise<void> {
  const args: FolderArgs = parseFolderArgs(argv);
  const engineJson: { readonly enabled: boolean } = resolveEngineJsonMode(argv);
  const resolvedOutput: { readonly outputDir: string } = resolveOutputDir(argv);
  const outputDir: string = resolvedOutput.outputDir;
  await mkdir(outputDir, { recursive: true });

  if (!(await pathExists(args.rootDir))) {
    throw new Error(`Folder not found: ${args.rootDir}`);
  }

  if (args.bundleOnly) {
    if (engineJson.enabled) {
      const event: EngineEventPayload = {
        ts: new Date().toISOString(),
        type: "run_started",
        mode: "folder_bundle_only",
        outputDir,
        rootDir: args.rootDir,
      };
      emitEngineEvent(event);
    }
    const folderRun = {
      schemaVersion: 1,
      mode: "folder_bundle_only" as const,
      rootDir: args.rootDir,
      routeCap: args.routeCap,
      routeCount: 0,
      routesTruncated: false,
      comboCap: DEFAULT_COMBO_CAP,
      combosDetected: 0,
      combosUsed: 0,
      combosTruncated: false,
      generatedAt: new Date().toISOString(),
      outputDir,
    };
    const folderRunPath: string = resolve(outputDir, "folder-run.json");
    await writeFile(folderRunPath, `${JSON.stringify(folderRun, null, 2)}\n`, "utf8");
    if (engineJson.enabled) {
      const event: EngineEventPayload = {
        ts: new Date().toISOString(),
        type: "artifact_written",
        kind: "file",
        relativePath: "folder-run.json",
      };
      emitEngineEvent(event);
    }
    const bundleArgv: readonly string[] = [
      "node",
      "signaler",
      "bundle",
      "--project-root",
      args.rootDir,
      "--output-dir",
      outputDir,
      ...(engineJson.enabled ? ["--engine-json"] : []),
    ];
    await runBundleCli(bundleArgv);
    if (engineJson.enabled) {
      const event: EngineEventPayload = {
        ts: new Date().toISOString(),
        type: "run_completed",
        mode: "folder_bundle_only",
        outputDir,
      };
      emitEngineEvent(event);
    }
    return;
  }

  const server = await startStaticServer({ rootDir: args.rootDir });
  if (engineJson.enabled) {
    const event: EngineEventPayload = {
      ts: new Date().toISOString(),
      type: "folder_server_started",
      baseUrl: server.baseUrl,
      rootDir: args.rootDir,
    };
    emitEngineEvent(event);
  }

  try {
    const detectedStatic = await detectRoutes({ projectRoot: args.rootDir, limit: args.routeCap, preferredDetectorId: "static-html" });
    const detected = detectedStatic.length > 0
      ? detectedStatic
      : await detectRoutes({ projectRoot: args.rootDir, limit: args.routeCap, preferredDetectorId: "spa-html" });
    const pagesDetected: readonly ApexPageConfig[] = detected.length > 0 ? toPages(detected) : [{ path: "/", label: "home", devices: DEFAULT_DEVICES }];
    const routesTruncated: boolean = detected.length >= args.routeCap;
    const combosDetected: number = pagesDetected.length * DEFAULT_DEVICES.length;
    const maxPagesAllowed: number = Math.max(1, Math.floor(DEFAULT_COMBO_CAP / DEFAULT_DEVICES.length));
    const pages: readonly ApexPageConfig[] = combosDetected > DEFAULT_COMBO_CAP ? pagesDetected.slice(0, maxPagesAllowed) : pagesDetected;
    const combosTruncated: boolean = combosDetected > DEFAULT_COMBO_CAP;
    if (engineJson.enabled) {
      const detectedEvent: EngineEventPayload = {
        ts: new Date().toISOString(),
        type: "folder_routes_detected",
        count: pages.length,
        cap: args.routeCap,
      };
      emitEngineEvent(detectedEvent);
      if (detected.length === 0) {
        const fallbackEvent: EngineEventPayload = {
          ts: new Date().toISOString(),
          type: "folder_routes_fallback",
          reason: "no_routes_detected",
        };
        emitEngineEvent(fallbackEvent);
      } else if (routesTruncated) {
        const truncatedEvent: EngineEventPayload = {
          ts: new Date().toISOString(),
          type: "folder_routes_truncated",
          cap: args.routeCap,
          count: pages.length,
        };
        emitEngineEvent(truncatedEvent);
      }
      if (combosTruncated) {
        const combosEvent: EngineEventPayload = {
          ts: new Date().toISOString(),
          type: "folder_combos_truncated",
          maxCombos: DEFAULT_COMBO_CAP,
          combosDetected,
          combosUsed: pages.length * DEFAULT_DEVICES.length,
        };
        emitEngineEvent(combosEvent);
      }
    }

    const config: ApexConfig = {
      baseUrl: server.baseUrl,
      pages,
      warmUp: false,
      incremental: false,
      parallel: 1,
      throttlingMethod: "simulate",
      cpuSlowdownMultiplier: 4,
    };

    const configPath: string = resolve(outputDir, "folder.apex.config.json");
    await writeFile(configPath, `${JSON.stringify(config, null, 2)}\n`, "utf8");

    const folderRun = {
      schemaVersion: 1,
      mode: "folder" as const,
      rootDir: args.rootDir,
      baseUrl: server.baseUrl,
      routeCap: args.routeCap,
      routeCount: pages.length,
      routesTruncated,
      comboCap: DEFAULT_COMBO_CAP,
      combosDetected,
      combosUsed: pages.length * DEFAULT_DEVICES.length,
      combosTruncated,
      generatedAt: new Date().toISOString(),
      outputDir,
    };
    const folderRunPath: string = resolve(outputDir, "folder-run.json");
    await writeFile(folderRunPath, `${JSON.stringify(folderRun, null, 2)}\n`, "utf8");
    if (engineJson.enabled) {
      const event: EngineEventPayload = {
        ts: new Date().toISOString(),
        type: "artifact_written",
        kind: "file",
        relativePath: "folder-run.json",
      };
      emitEngineEvent(event);
    }

    const auditArgv: readonly string[] = [
      "node",
      "signaler",
      "--config",
      configPath,
      "--output-dir",
      outputDir,
      ...(engineJson.enabled ? ["--engine-json"] : []),
    ];

    await runAuditCli(auditArgv);
  } finally {
    await server.close();
    if (engineJson.enabled) {
      const event: EngineEventPayload = {
        ts: new Date().toISOString(),
        type: "folder_server_stopped",
      };
      emitEngineEvent(event);
    }
  }
}
