import { resolve } from "node:path";
import { parseBaseUrlPort } from "./engine/serve/resolve-serve-plan.js";
import { runRepoExplore, writeExploreManifest } from "./engine/explore/repo-explore.js";

export type ExploreCliArgs = {
  readonly cwd: string;
  readonly outputDir: string;
  readonly baseUrl?: string;
  readonly json: boolean;
  readonly routeLimit?: number;
};

export function parseExploreCliArgs(argv: readonly string[]): ExploreCliArgs {
  let cwd = process.cwd();
  let outputDir = resolve(cwd, ".signaler");
  let baseUrl: string | undefined;
  let json = false;
  let routeLimit: number | undefined;

  for (let i = 2; i < argv.length; i += 1) {
    const arg = argv[i] ?? "";
    if (arg === "--cwd" && i + 1 < argv.length) {
      cwd = resolve(argv[i + 1] ?? cwd);
      i += 1;
      continue;
    }
    if ((arg === "--dir" || arg === "--output-dir") && i + 1 < argv.length) {
      outputDir = resolve(argv[i + 1] ?? outputDir);
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
    if (arg === "--json") {
      json = true;
      continue;
    }
  }

  return { cwd, outputDir, baseUrl, json, routeLimit };
}

export async function runExploreCli(argv: readonly string[]): Promise<void> {
  const args = parseExploreCliArgs(argv);
  const manifest = await runRepoExplore({
    projectRoot: args.cwd,
    preferredPort: args.baseUrl ? parseBaseUrlPort(args.baseUrl) : undefined,
    routeLimit: args.routeLimit,
  });
  const path = await writeExploreManifest({
    outputDir: args.outputDir,
    manifest,
  });

  if (args.json) {
    console.log(JSON.stringify({ ...manifest, explorePath: path }, null, 2));
    return;
  }

  console.log(`Explore: ${manifest.routes.length} routes, ${manifest.runningServers.length} loopback server(s)`);
  if (manifest.recommendedBaseUrl) {
    console.log(`Recommended base URL: ${manifest.recommendedBaseUrl}`);
  }
  if (manifest.recommendAuditBypass) {
    console.log("Auth signals detected — audit may prompt for lab env injection during managed serve.");
  }
  console.log(`Manifest: ${path}`);
}
