import { mkdir, writeFile } from "node:fs/promises";
import { join, resolve } from "node:path";
import prompts, { type PromptObject } from "prompts";
import { detectRoutes, type DetectedRoute } from "./route-detectors.js";
import { pathExists } from "./infrastructure/filesystem/utils.js";
import type { ApexConfig, ApexDevice, ApexPageConfig } from "./core/types.js";
import { runAuditCli } from "./cli.js";

interface QuickstartArgs {
  readonly baseUrl?: string;
  readonly projectRoot: string;
}

interface BaseUrlAnswer {
  readonly baseUrl: string;
}

const DEFAULT_BASE_URL = "http://localhost:3000" as const;
const DEFAULT_RUNS = 1;
const DEFAULT_DEVICES: readonly ApexDevice[] = ["mobile", "desktop"] as const;
const DEFAULT_ROUTE_LIMIT = 5;
const QUICKSTART_CONFIG_NAME = "quickstart.config.json" as const;
const PROMPT_OPTIONS = { onCancel: handleCancel } as const;

const baseUrlQuestion: PromptObject = {
  type: "text",
  name: "baseUrl",
  message: "Base URL of the running app",
  initial: DEFAULT_BASE_URL,
  validate: (value: string) => (value.startsWith("http") ? true : "Enter a full http(s) URL."),
};

function handleCancel(): true {
  // eslint-disable-next-line no-console
  console.log("Quickstart cancelled. No audits run.");
  process.exit(1);
  return true;
}

async function ask<T extends object>(question: PromptObject): Promise<T> {
  const answers = await prompts(question, PROMPT_OPTIONS);
  return answers as T;
}

function parseQuickstartArgs(argv: readonly string[]): QuickstartArgs {
  let baseUrl: string | undefined;
  let projectRoot: string = ".";
  for (let index = 2; index < argv.length; index += 1) {
    const arg: string = argv[index];
    if ((arg === "--base-url" || arg === "-b") && index + 1 < argv.length) {
      baseUrl = argv[index + 1];
      index += 1;
    } else if ((arg === "--project-root" || arg === "-p") && index + 1 < argv.length) {
      projectRoot = argv[index + 1];
      index += 1;
    }
  }
  return { baseUrl, projectRoot };
}

async function resolveBaseUrl(cliBaseUrl: string | undefined): Promise<string> {
  if (cliBaseUrl && cliBaseUrl.length > 0) {
    return cliBaseUrl;
  }
  // eslint-disable-next-line no-console
  console.error("Quickstart requires --base-url <url>. No base URL was provided.");
  process.exit(1);
  return DEFAULT_BASE_URL;
}

async function resolveProjectRoot(rawProjectRoot: string): Promise<string> {
  const absolutePath: string = resolve(rawProjectRoot);
  if (await pathExists(absolutePath)) {
    return absolutePath;
  }
  // eslint-disable-next-line no-console
  console.log(`Project root ${absolutePath} does not exist. Falling back to current directory.`);
  return process.cwd();
}

async function detectQuickstartPages(projectRoot: string): Promise<ApexPageConfig[]> {
  const routes: readonly DetectedRoute[] = await detectRoutes({ projectRoot, limit: DEFAULT_ROUTE_LIMIT });
  if (routes.length === 0) {
    return buildFallbackPages();
  }
  return routes.map((route) => convertRouteToPage(route));
}

function buildFallbackPages(): ApexPageConfig[] {
  return [
    {
      path: "/",
      label: "home",
      devices: DEFAULT_DEVICES,
    },
  ];
}

function convertRouteToPage(route: DetectedRoute): ApexPageConfig {
  return {
    path: route.path,
    label: route.label,
    devices: DEFAULT_DEVICES,
  };
}

async function writeQuickstartConfig(config: ApexConfig): Promise<string> {
  const outputDir: string = resolve(".signaler");
  await mkdir(outputDir, { recursive: true });
  const configPath: string = join(outputDir, QUICKSTART_CONFIG_NAME);
  await writeFile(configPath, `${JSON.stringify(config, null, 2)}\n`, "utf8");
  return configPath;
}

async function buildQuickstartConfig(args: QuickstartArgs): Promise<string> {
  const baseUrl: string = await resolveBaseUrl(args.baseUrl);
  const projectRoot: string = await resolveProjectRoot(args.projectRoot);
  const pages: readonly ApexPageConfig[] = await detectQuickstartPages(projectRoot);
  const config: ApexConfig = {
    baseUrl,
    pages,
    runs: DEFAULT_RUNS,
  };
  return writeQuickstartConfig(config);
}

/**
 * Run the ApexAuditor quickstart flow.
 *
 * This command discovers common routes from the current project, asks for a base URL
 * if needed, writes a temporary config file, and then delegates to the audit CLI.
 *
 * @param argv - The process arguments array.
 */
export async function runQuickstartCli(argv: readonly string[]): Promise<void> {
  const args: QuickstartArgs = parseQuickstartArgs(argv);
  const configPath: string = await buildQuickstartConfig(args);
  const auditArgv: readonly string[] = ["node", "signaler", "--config", configPath, "--output-dir", resolve(".signaler")];
  await runAuditCli(auditArgv);
}
