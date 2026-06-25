import { resolve } from "node:path";
import { parseBaseUrlPort } from "./engine/serve/resolve-serve-plan.js";
import { runRepoExplore, writeExploreManifest } from "./engine/explore/repo-explore.js";
import { writeAutoConfigIfMissing } from "./engine/explore/ensure-project-config.js";
import { resolveAttachBaseUrl } from "./engine/explore/attach-first.js";
import { reportServerNotReady } from "./engine/explore/server-not-ready-guidance.js";
import { buildAutoConfigFromExplore } from "./engine/explore/auto-config.js";
import { runAuditOrchestratorCli } from "./shell/audit-orchestrator-cli.js";

export type BootstrapCliArgs = {
  readonly cwd: string;
  readonly outputDir: string;
  readonly configPath: string;
  readonly baseUrl?: string;
  readonly yes: boolean;
  readonly nonInteractive: boolean;
  readonly audit: boolean;
  readonly managedServe: boolean;
  readonly json: boolean;
  readonly routeLimit?: number;
};

export function parseBootstrapCliArgs(argv: readonly string[]): BootstrapCliArgs {
  let cwd = process.cwd();
  let outputDir = resolve(cwd, ".signaler");
  let configPath = resolve(cwd, "signaler.config.json");
  let baseUrl: string | undefined;
  let yes = false;
  let nonInteractive = false;
  let audit = false;
  let managedServe = false;
  let json = false;
  let routeLimit: number | undefined;

  for (let i = 2; i < argv.length; i += 1) {
    const arg = argv[i] ?? "";
    if (arg === "--cwd" && i + 1 < argv.length) {
      cwd = resolve(argv[i + 1] ?? cwd);
      configPath = resolve(cwd, "signaler.config.json");
      outputDir = resolve(cwd, ".signaler");
      i += 1;
      continue;
    }
    if ((arg === "--dir" || arg === "--output-dir") && i + 1 < argv.length) {
      outputDir = resolve(argv[i + 1] ?? outputDir);
      i += 1;
      continue;
    }
    if ((arg === "--config" || arg === "-c") && i + 1 < argv.length) {
      configPath = resolve(argv[i + 1] ?? configPath);
      i += 1;
      continue;
    }
    if (arg === "--base-url" && i + 1 < argv.length) {
      baseUrl = argv[i + 1];
      i += 1;
      continue;
    }
    if (arg === "--route-limit" && i + 1 < argv.length) {
      const value = Number.parseInt(argv[i + 1] ?? "", 10);
      if (!Number.isFinite(value) || value < 1) {
        throw new Error(`Invalid --route-limit value: ${argv[i + 1]}. Expected positive integer.`);
      }
      routeLimit = value;
      i += 1;
      continue;
    }
    if (arg === "--yes" || arg === "-y") {
      yes = true;
      continue;
    }
    if (arg === "--non-interactive") {
      nonInteractive = true;
      continue;
    }
    if (arg === "--audit") {
      audit = true;
      continue;
    }
    if (arg === "--managed-serve" || arg === "--auto-serve") {
      managedServe = true;
      continue;
    }
    if (arg === "--json") {
      json = true;
      continue;
    }
  }

  return {
    cwd,
    outputDir,
    configPath,
    baseUrl,
    yes,
    nonInteractive: nonInteractive || !process.stdin.isTTY,
    audit,
    managedServe,
    json,
    routeLimit,
  };
}

export async function runBootstrapCli(argv: readonly string[]): Promise<void> {
  const args = parseBootstrapCliArgs(argv);
  const manifest = await runRepoExplore({
    projectRoot: args.cwd,
    preferredPort: args.baseUrl ? parseBaseUrlPort(args.baseUrl) : undefined,
    routeLimit: args.routeLimit,
  });
  const explorePath = await writeExploreManifest({
    outputDir: args.outputDir,
    manifest,
  });

  const autoConfig = await writeAutoConfigIfMissing({
    configPath: args.configPath,
    manifest,
    baseUrlOverride: args.baseUrl,
    routeLimit: args.routeLimit,
    quiet: args.json,
  });

  if (args.json) {
    console.log(
      JSON.stringify(
        {
          explorePath,
          manifest,
          autoConfig,
        },
        null,
        2,
      ),
    );
    if (!args.audit) {
      return;
    }
  } else {
    // eslint-disable-next-line no-console
    console.log(
      `Explore: ${manifest.routes.length} routes, ${manifest.runningServers.length} loopback server(s) → ${explorePath}`,
    );
    if (!autoConfig.wrote) {
      // eslint-disable-next-line no-console
      console.log(`Config exists: ${args.configPath} (not overwritten)`);
    }
    if (!args.audit) {
      // eslint-disable-next-line no-console
      console.log("\nNext: start your dev server, then run:");
      // eslint-disable-next-line no-console
      console.log("  signaler audit --cwd . --skip-discover");
      return;
    }
  }

  const effectiveBaseUrl =
    args.baseUrl ??
    autoConfig.plan?.baseUrl ??
    buildAutoConfigFromExplore({ manifest }).config.baseUrl;

  if (!args.managedServe) {
    const attach = await resolveAttachBaseUrl({
      explore: manifest,
      requestedBaseUrl: effectiveBaseUrl,
    });
    if (!attach) {
      await reportServerNotReady({
        projectRoot: args.cwd,
        baseUrl: effectiveBaseUrl,
        outputDir: args.outputDir,
        explore: manifest,
        reason: "no-server",
      });
      process.exitCode = 0;
      return;
    }
  }

  const auditArgv: string[] = [
    "node",
    "signaler",
    "audit",
    "--cwd",
    args.cwd,
    "--config",
    args.configPath,
    "--dir",
    args.outputDir,
    "--skip-discover",
  ];
  if (args.baseUrl) {
    auditArgv.push("--base-url", args.baseUrl);
  } else if (effectiveBaseUrl) {
    auditArgv.push("--base-url", effectiveBaseUrl);
  }
  if (args.yes) {
    auditArgv.push("--yes");
  }
  if (args.nonInteractive) {
    auditArgv.push("--non-interactive");
  }
  if (args.managedServe) {
    auditArgv.push("--managed-serve");
  }

  await runAuditOrchestratorCli(auditArgv);
}
