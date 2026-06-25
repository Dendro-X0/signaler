import { existsSync } from "node:fs";
import { mkdir, writeFile } from "node:fs/promises";
import { dirname } from "node:path";
import {
  buildAutoConfigFromExplore,
  formatAutoConfigSummary,
  type AutoConfigPlan,
} from "./auto-config.js";
import type { RepoExploreManifest } from "./repo-explore.js";

export type AutoConfigWriteResult = {
  readonly wrote: boolean;
  readonly configPath: string;
  readonly plan?: AutoConfigPlan;
};

/**
 * Write `signaler.config.json` when missing, using explore scan results.
 * Returns immediately when config already exists.
 */
export async function writeAutoConfigIfMissing(params: {
  readonly configPath: string;
  readonly manifest: RepoExploreManifest;
  readonly baseUrlOverride?: string;
  readonly routeLimit?: number;
  readonly quiet?: boolean;
}): Promise<AutoConfigWriteResult> {
  if (existsSync(params.configPath)) {
    return { wrote: false, configPath: params.configPath };
  }

  const { config, plan } = buildAutoConfigFromExplore({
    manifest: params.manifest,
    baseUrlOverride: params.baseUrlOverride,
    routeLimit: params.routeLimit,
  });

  await mkdir(dirname(params.configPath), { recursive: true });
  await writeFile(params.configPath, `${JSON.stringify(config, null, 2)}\n`, "utf8");

  if (!params.quiet) {
    // eslint-disable-next-line no-console
    console.log(`Auto-config: wrote ${params.configPath}`);
    // eslint-disable-next-line no-console
    console.log(formatAutoConfigSummary(plan));
  }

  return { wrote: true, configPath: params.configPath, plan };
}
