import { access, mkdir, readFile, readdir, writeFile } from "node:fs/promises";
import type { Dirent } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { request as httpRequest } from "node:http";
import { request as httpsRequest } from "node:https";
import prompts, { type PromptObject } from "prompts";
import { detectRoutes, type DetectedRoute, type RouteDetectionLogEntry, type RouteDetectorId } from "./route-detectors.js";
import { discoverRuntimeRoutes } from "./sitemap-discovery.js";
import { pathExists } from "./infrastructure/filesystem/utils.js";
import { discoverNextProjects, type DiscoveredProject } from "./project-discovery.js";
import type { ApexConfig, ApexDevice, ApexPageConfig } from "./core/types.js";

interface WizardArgs {
  readonly configPath: string;
  readonly mode: "quick" | "advanced";
  readonly runAfterInit: boolean;
  readonly scope: "quick" | "full" | "file" | undefined;
  readonly routesFile: string | undefined;
  readonly baseUrl: string | undefined;
  readonly projectRoot: string | undefined;
  readonly profile: ProjectProfileId | undefined;
  readonly yes: boolean;
  readonly nonInteractive: boolean;
}

export interface DiscoverySummary {
  readonly generatedAt: string;
  readonly scope: "quick" | "full" | "file" | "interactive";
  readonly scopeRequested: "quick" | "full" | "file" | "interactive";
  readonly scopeResolved: "quick" | "full" | "file" | "interactive";
  readonly status: "ok" | "warn" | "error";
  readonly warnings?: readonly string[];
  readonly repoRoot: string;
  readonly baseUrl: string;
  readonly totals: {
    readonly detected: number;
    readonly selected: number;
    readonly excludedDynamic: number;
    readonly excludedByFilter: number;
    readonly excludedByScope: number;
  };
  readonly routes: {
    readonly selected: readonly string[];
    readonly excludedDynamic: readonly string[];
  };
  readonly strategy: {
    readonly routeCap: number;
    readonly source: "filesystem" | "runtime" | "mixed" | "file";
  };
}

class WizardAbortError extends Error {
  public readonly reason: "cancelled" | "overwrite_declined";

  public constructor(reason: "cancelled" | "overwrite_declined") {
    super(reason);
    this.reason = reason;
  }
}

interface BaseAnswers {
  readonly baseUrl: string;
  readonly query?: string;
}

type LocalDevServerInfo = {
  readonly host: "localhost" | "127.0.0.1";
  readonly port: number;
};

interface PageAnswers {
  readonly path: string;
  readonly label: string;
  readonly devices: ApexDevice[];
}

interface DetectRoutesAnswer {
  readonly value: boolean;
}

interface ProjectRootAnswer {
  readonly projectRoot: string;
}

interface RouteSelectionAnswer {
  readonly indexes: number[];
}

interface RouteFilterConfirmAnswer {
  readonly value: boolean;
}

interface RouteFilterAnswer {
  readonly include: string;
  readonly exclude: string;
}

interface ProjectProfileAnswer {
  readonly profile: ProjectProfileId;
}

interface DetectorChoiceAnswer {
  readonly detector: RouteDetectorId;
}

interface ProjectSelectionAnswer {
  readonly projectRoot: string;
}

interface MonorepoAppSelectionAnswer {
  readonly root: string;
}

type ProjectProfileId = "next" | "nuxt" | "spa" | "remix" | "sveltekit" | "custom";

type MonorepoCandidate = {
  readonly root: string;
  readonly name: string;
  readonly profile: ProjectProfileId;
};

const PROFILE_TO_DETECTOR: Record<ProjectProfileId, RouteDetectorId | undefined> = {
  next: "next-app",
  nuxt: "nuxt-pages",
  spa: "spa-html",
  remix: "remix-routes",
  sveltekit: "sveltekit-routes",
  custom: undefined,
};

const DEFAULT_BASE_URL = "http://localhost:3000" as const;
const DEFAULT_PROJECT_ROOT = "." as const;
const QUICK_STARTER_MAX_ROUTES = 12;
const DEFAULT_PRESELECT_COUNT = 5;
const DEFAULT_ROUTE_CAP = 50;
const FULL_SCOPE_ROUTE_CAP = 1000;
const DEFAULT_DEVICES: readonly ApexDevice[] = ["mobile", "desktop"] as const;
const PROMPT_OPTIONS = { onCancel: handleCancel } as const;
const profileChoices: readonly { readonly title: string; readonly value: ProjectProfileId }[] = [
  { title: "Next.js", value: "next" },
  { title: "Nuxt (Vue)", value: "nuxt" },
  { title: "Remix", value: "remix" },
  { title: "SvelteKit", value: "sveltekit" },
  { title: "Single Page App (Vite/CRA/etc.)", value: "spa" },
  { title: "Custom/manual", value: "custom" },
] as const;
const overwriteQuestion: PromptObject = {
  type: "confirm",
  name: "value",
  message: "Found existing config. Overwrite?",
  initial: true,
};
const pageQuestions: readonly PromptObject[] = [
  {
    type: "text",
    name: "path",
    message: "Page path (must start with /)",
    validate: (value: string) => (value.startsWith("/") ? true : "Path must start with '/'."),
  },
  {
    type: "text",
    name: "label",
    message: "Short label for reports",
  },
  {
    type: "multiselect",
    name: "devices",
    message: "Devices to audit",
    instructions: false,
    min: 1,
    choices: [
      { title: "Mobile", value: "mobile", selected: true },
      { title: "Desktop", value: "desktop", selected: true },
    ],
  },
];
const addFirstPageQuestion: PromptObject = {
  type: "confirm",
  name: "value",
  message: "No pages were auto-detected. Add a page to audit now? (You can always edit signaler.config.json later)",
  initial: true,
};
const addMorePagesQuestion: PromptObject = {
  type: "confirm",
  name: "value",
  message: "Add another page to audit? (Optional — you can edit signaler.config.json later)",
  initial: false,
};
const projectRootQuestion: PromptObject = {
  type: "text",
  name: "projectRoot",
  message: "Path to your web project root (relative or absolute)",
  initial: DEFAULT_PROJECT_ROOT,
};
const detectorChoiceQuestion: PromptObject = {
  type: "select",
  name: "detector",
  message: "Choose a detector to guide auto-discovery",
  choices: [
    { title: "Next.js", value: "next-app" },
    { title: "Nuxt (pages/)", value: "nuxt-pages" },
    { title: "Remix", value: "remix-routes" },
    { title: "SvelteKit", value: "sveltekit-routes" },
    { title: "SPA Crawl", value: "spa-html" },
    { title: "Static HTML (dist/build/out/public/src)", value: "static-html" },
  ],
};

const routeFilterConfirmQuestion: PromptObject = {
  type: "confirm",
  name: "value",
  message: "Filter detected routes with include/exclude patterns?",
  initial: false,
};

const routeFilterQuestions: readonly PromptObject[] = [
  {
    type: "text",
    name: "include",
    message: "Include patterns (comma-separated, optional)",
    initial: "",
  },
  {
    type: "text",
    name: "exclude",
    message: "Exclude patterns (comma-separated, optional)",
    initial: "",
  },
];

const ROUTE_FILTER_DEFAULT_ON_THRESHOLD: number = 15;

function buildSuggestedExcludePatterns(profile: ProjectProfileId): readonly string[] {
  if (profile === "next") {
    return ["/_next/*", "/api/*"];
  }
  if (profile === "nuxt") {
    return ["/__nuxt/*", "/api/*"];
  }
  if (profile === "sveltekit") {
    return ["/__data.json*", "/api/*"];
  }
  if (profile === "remix") {
    return ["/api/*"];
  }
  return [];
}

function buildRouteFilterQuestions(params: { readonly profile: ProjectProfileId; readonly suggestedExclude: readonly string[] }): readonly PromptObject[] {
  const excludeInitial: string = params.suggestedExclude.join(",");
  return [
    {
      type: "text",
      name: "include",
      message: "Include patterns (comma-separated, optional)",
      initial: "",
    },
    {
      type: "text",
      name: "exclude",
      message: "Exclude patterns (comma-separated, optional)",
      initial: excludeInitial,
    },
  ];
}

function handleCancel(): true {
  console.log("Wizard cancelled. No config written.");
  throw new WizardAbortError("cancelled");
}

async function ask<T extends object>(question: PromptObject | readonly PromptObject[]): Promise<T> {
  const answers = await prompts(question as PromptObject | PromptObject[], PROMPT_OPTIONS);
  return answers as T;
}

function buildBaseQuestions(initialBaseUrl: string, includeQuery: boolean): readonly PromptObject[] {
  const questions: PromptObject[] = [
    {
      type: "text",
      name: "baseUrl",
      message: "Base URL of the running app",
      initial: initialBaseUrl,
      validate: (value: string) => (value.startsWith("http") ? true : "Enter a full http(s) URL."),
    },
  ];
  if (includeQuery) {
    questions.push({
      type: "text",
      name: "query",
      message: "Query string appended to every route (optional)",
      initial: "",
    });
  }
  return questions;
}

function tryParseLocalDevServer(baseUrl: string): LocalDevServerInfo | undefined {
  let parsed: URL;
  try {
    parsed = new URL(baseUrl);
  } catch {
    return undefined;
  }
  const host: string = parsed.hostname;
  if (host !== "localhost" && host !== "127.0.0.1") {
    return undefined;
  }
  const port: number = parsed.port.length > 0 ? Number(parsed.port) : NaN;
  if (!Number.isFinite(port) || port <= 0) {
    return undefined;
  }
  return { host, port };
}

async function collectBaseAnswersWithSafety(params: { readonly initialBaseUrl: string; readonly includeQuery: boolean }): Promise<BaseAnswers> {
  while (true) {
    const answers: BaseAnswers = await ask<BaseAnswers>(buildBaseQuestions(params.initialBaseUrl, params.includeQuery));
    const info: LocalDevServerInfo | undefined = tryParseLocalDevServer(answers.baseUrl);
    if (!info) {
      return answers;
    }
    const confirmed = await ask<{ readonly value: boolean }>({
      type: "confirm",
      name: "value",
      message: `Base URL is ${answers.baseUrl}. Make sure the dev server is running for this project on port ${info.port} to avoid config conflicts when multiple projects are open. Continue?`,
      initial: true,
    });
    if (confirmed.value) {
      return answers;
    }
  }
}

async function isUrlReachable(url: string): Promise<boolean> {
  const parsed = new URL(url);
  const client = parsed.protocol === "https:" ? httpsRequest : httpRequest;
  return await new Promise<boolean>((resolvePromise) => {
    const request = client(
      {
        hostname: parsed.hostname,
        port: parsed.port ? Number(parsed.port) : parsed.protocol === "https:" ? 443 : 80,
        path: "/",
        method: "GET",
        timeout: 1200,
      },
      (response) => {
        response.resume();
        resolvePromise((response.statusCode ?? 0) > 0);
      },
    );
    request.on("timeout", () => {
      request.destroy();
      resolvePromise(false);
    });
    request.on("error", () => resolvePromise(false));
    request.end();
  });
}

async function detectLikelyBaseUrl(): Promise<string> {
  const candidates: readonly string[] = [
    "http://localhost:3000",
    "http://127.0.0.1:3000",
    "http://localhost:5173",
    "http://127.0.0.1:5173",
    "http://localhost:4173",
    "http://127.0.0.1:4173",
    "http://localhost:8080",
    "http://127.0.0.1:8080",
  ];
  for (const candidate of candidates) {
    if (await isUrlReachable(candidate)) {
      return candidate;
    }
  }
  return DEFAULT_BASE_URL;
}

function profileDisplayName(profile: ProjectProfileId): string {
  switch (profile) {
    case "next":
      return "Next.js";
    case "nuxt":
      return "Nuxt";
    case "remix":
      return "Remix";
    case "sveltekit":
      return "SvelteKit";
    case "spa":
      return "Single Page App";
    case "custom":
      return "Custom/manual";
    default: {
      const exhaustive: never = profile;
      return exhaustive;
    }
  }
}

export function parseWizardArgs(argv: readonly string[]): WizardArgs {
  let configPath: string | undefined;
  let mode: "quick" | "advanced" = "quick";
  let runAfterInit = false;
  let scope: "quick" | "full" | "file" | undefined = "full";
  let routesFile: string | undefined;
  let baseUrl: string | undefined;
  let projectRoot: string | undefined;
  let profile: ProjectProfileId | undefined;
  let yes = false;
  let nonInteractive = false;
  for (let index = 2; index < argv.length; index += 1) {
    const arg: string = argv[index];
    if ((arg === "--config" || arg === "-c") && index + 1 < argv.length) {
      configPath = argv[index + 1];
      index += 1;
    } else if (arg === "--quick") {
      mode = "quick";
    } else if (arg === "--advanced") {
      mode = "advanced";
    } else if (arg === "--run") {
      runAfterInit = true;
    } else if (arg === "--scope" && index + 1 < argv.length) {
      const value = argv[index + 1];
      if (value === "quick" || value === "full" || value === "file") {
        scope = value;
      }
      index += 1;
    } else if (arg.startsWith("--scope=")) {
      const value = arg.split("=")[1];
      if (value === "quick" || value === "full" || value === "file") {
        scope = value;
      }
    } else if ((arg === "--routes-file" || arg === "--scope-file") && index + 1 < argv.length) {
      routesFile = argv[index + 1];
      index += 1;
    } else if (arg.startsWith("--routes-file=") || arg.startsWith("--scope-file=")) {
      routesFile = arg.split("=")[1];
    } else if (arg === "--base-url" && index + 1 < argv.length) {
      baseUrl = argv[index + 1];
      index += 1;
    } else if (arg.startsWith("--base-url=")) {
      baseUrl = arg.split("=")[1];
    } else if ((arg === "--project-root" || arg === "--root") && index + 1 < argv.length) {
      projectRoot = argv[index + 1];
      index += 1;
    } else if (arg.startsWith("--project-root=") || arg.startsWith("--root=")) {
      projectRoot = arg.split("=")[1];
    } else if (arg === "--profile" && index + 1 < argv.length) {
      const value = argv[index + 1];
      if (value === "next" || value === "nuxt" || value === "remix" || value === "sveltekit" || value === "spa" || value === "custom") {
        profile = value;
      }
      index += 1;
    } else if (arg.startsWith("--profile=")) {
      const value = arg.split("=")[1];
      if (value === "next" || value === "nuxt" || value === "remix" || value === "sveltekit" || value === "spa" || value === "custom") {
        profile = value;
      }
    } else if (arg === "--yes" || arg === "-y") {
      yes = true;
    } else if (arg === "--non-interactive") {
      nonInteractive = true;
    }
  }
  return { configPath: configPath ?? "signaler.config.json", mode, runAfterInit, scope, routesFile, baseUrl, projectRoot, profile, yes, nonInteractive };
}

async function resolveProjectRootForWizard(mode: "quick" | "advanced"): Promise<string> {
  const cwdRoot: string = resolve(DEFAULT_PROJECT_ROOT);
  if (mode === "quick") {
    const useCwd = await ask<{ readonly value: boolean }>({
      type: "confirm",
      name: "value",
      message: `Use current directory as project root? ${cwdRoot}`,
      initial: true,
    });
    if (useCwd.value) {
      return cwdRoot;
    }
  }
  const projectRootAnswer = await ask<ProjectRootAnswer>(projectRootQuestion);
  return resolve(projectRootAnswer.projectRoot);
}

async function fileExists(path: string): Promise<boolean> {
  try {
    await access(path);
    return true;
  } catch {
    return false;
  }
}

function buildLabel(routePath: string): string {
  if (routePath === "/") {
    return "home";
  }
  const segments: readonly string[] = routePath.split("/").filter(Boolean);
  const last: string = segments[segments.length - 1] ?? "page";
  return last.replace(/^:/, "");
}

function mergeRoutes(params: { readonly primary: readonly DetectedRoute[]; readonly secondaryPaths: readonly string[] }): readonly DetectedRoute[] {
  const merged: DetectedRoute[] = [...params.primary];
  const seen: Set<string> = new Set(params.primary.map((r) => r.path));
  for (const path of params.secondaryPaths) {
    if (!seen.has(path)) {
      seen.add(path);
      merged.push({ path, label: buildLabel(path), source: "sitemap" });
    }
  }
  return merged;
}

function readDependencies(raw: unknown): Record<string, string> {
  if (typeof raw !== "object" || raw === null) {
    return {};
  }
  const record = raw as Record<string, unknown>;
  const output: Record<string, string> = {};
  for (const [key, value] of Object.entries(record)) {
    if (typeof value === "string") {
      output[key] = value;
    }
  }
  return output;
}

async function detectProjectProfileFromPackageJsonPath(packageJsonPath: string): Promise<ProjectProfileId | undefined> {
  if (!(await pathExists(packageJsonPath))) {
    return undefined;
  }
  let raw: string;
  try {
    await access(packageJsonPath);
    raw = await readFile(packageJsonPath, "utf8");
  } catch {
    return undefined;
  }
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return undefined;
  }
  const obj = parsed as { readonly dependencies?: unknown; readonly devDependencies?: unknown; readonly name?: unknown };
  const deps: Record<string, string> = { ...readDependencies(obj.dependencies), ...readDependencies(obj.devDependencies) };
  const has = (name: string): boolean => Object.prototype.hasOwnProperty.call(deps, name);
  if (has("nuxt")) {
    return "nuxt";
  }
  if (has("@sveltejs/kit")) {
    return "sveltekit";
  }
  if (has("next")) {
    return "next";
  }
  if (has("@remix-run/react") || has("@remix-run/node") || has("@remix-run/dev") || has("@react-router/dev")) {
    return "remix";
  }
  if (has("vite") || has("react-scripts")) {
    return "spa";
  }
  void obj;
  return undefined;
}

async function detectProjectProfileFromPackageJson(repoRoot: string): Promise<ProjectProfileId | undefined> {
  return detectProjectProfileFromPackageJsonPath(join(repoRoot, "package.json"));
}

async function readPackageName(repoRoot: string): Promise<string> {
  const packageJsonPath: string = join(repoRoot, "package.json");
  if (!(await pathExists(packageJsonPath))) {
    return repoRoot;
  }
  let raw: string;
  try {
    raw = await readFile(packageJsonPath, "utf8");
  } catch {
    return repoRoot;
  }
  try {
    const parsed: unknown = JSON.parse(raw);
    const record = parsed as { readonly name?: unknown };
    return typeof record.name === "string" && record.name.length > 0 ? record.name : repoRoot;
  } catch {
    return repoRoot;
  }
}

async function findMonorepoCandidates(repoRoot: string): Promise<readonly MonorepoCandidate[]> {
  const containers: readonly string[] = ["apps", "packages"] as const;
  const candidates: MonorepoCandidate[] = [];
  for (const container of containers) {
    const containerPath: string = join(repoRoot, container);
    if (!(await pathExists(containerPath))) {
      continue;
    }
    let entries: readonly Dirent[] = [];
    try {
      entries = await readdir(containerPath, { withFileTypes: true });
    } catch {
      entries = [];
    }
    for (const entry of entries) {
      if (!entry.isDirectory()) {
        continue;
      }
      const appRoot: string = join(containerPath, entry.name);
      const profile: ProjectProfileId | undefined = await detectProjectProfileFromPackageJson(appRoot);
      if (!profile) {
        continue;
      }
      const name: string = await readPackageName(appRoot);
      candidates.push({ root: appRoot, name, profile });
    }
  }
  return candidates;
}

async function resolveWizardProjectRoot(
  repoRoot: string,
  options?: { readonly nonInteractive?: boolean },
): Promise<{ readonly repoRoot: string; readonly detectedProfile: ProjectProfileId | undefined }> {
  const rootProfile: ProjectProfileId | undefined = await detectProjectProfileFromPackageJson(repoRoot);
  if (rootProfile) {
    return { repoRoot, detectedProfile: rootProfile };
  }
  const candidates: readonly MonorepoCandidate[] = await findMonorepoCandidates(repoRoot);
  if (candidates.length === 0) {
    return { repoRoot, detectedProfile: undefined };
  }
  if (options?.nonInteractive) {
    const selected = candidates[0] as MonorepoCandidate;
    return { repoRoot: selected.root, detectedProfile: selected.profile };
  }
  const choices = candidates.map((candidate) => ({
    title: `${candidate.name} (${candidate.root}) - ${profileDisplayName(candidate.profile)}`,
    value: candidate.root,
  }));
  const selected = await ask<MonorepoAppSelectionAnswer>({
    type: "select",
    name: "root",
    message: "Monorepo detected. Which app/package do you want to configure?",
    choices,
  });
  const resolvedRoot: string = selected.root ?? candidates[0]?.root ?? repoRoot;
  const resolvedProfile: ProjectProfileId | undefined = await detectProjectProfileFromPackageJson(resolvedRoot);
  return { repoRoot: resolvedRoot, detectedProfile: resolvedProfile };
}

function buildProfileQuestion(params: {
  readonly detectedProfile: ProjectProfileId | undefined;
}): PromptObject {
  const detected = params.detectedProfile;
  const choices = profileChoices.map((choice) => {
    const title: string = detected === choice.value ? `${choice.title} (detected)` : choice.title;
    return { title, value: choice.value };
  });
  const initial: number | undefined = detected ? Math.max(0, choices.findIndex((choice) => choice.value === detected)) : undefined;
  return {
    type: "select",
    name: "profile",
    message: "Which project type are you configuring?",
    choices,
    ...(typeof initial === "number" ? { initial } : {}),
  };
}

async function ensureWritable(path: string, options?: { readonly nonInteractive?: boolean; readonly yes?: boolean }): Promise<void> {
  if (!(await fileExists(path))) {
    return;
  }
  if (options?.nonInteractive) {
    if (options.yes) {
      return;
    }
    throw new Error(`Config exists at ${path}. Pass --yes in non-interactive mode to overwrite.`);
  }
  const response = await ask<{ value: boolean }>(overwriteQuestion);
  if (response.value) {
    return;
  }
  console.log("Aborted. Existing config preserved.");
  throw new WizardAbortError("overwrite_declined");
}

function buildBaseConfig(answers: BaseAnswers): Pick<ApexConfig, "baseUrl" | "query" | "runs"> {
  return {
    baseUrl: answers.baseUrl.trim(),
    query: answers.query && answers.query.length > 0 ? answers.query : undefined,
    runs: 1,
  };
}

async function confirmAddPage(hasPages: boolean): Promise<boolean> {
  const question = hasPages ? addMorePagesQuestion : addFirstPageQuestion;
  const response = await ask<{ value: boolean }>(question);
  return response.value;
}

async function collectSinglePage(): Promise<ApexPageConfig> {
  const answers = await ask<PageAnswers>(pageQuestions);
  const label: string = answers.label && answers.label.length > 0 ? answers.label : answers.path;
  return { path: answers.path, label, devices: answers.devices };
}

async function collectPages(initialPages: readonly ApexPageConfig[]): Promise<ApexPageConfig[]> {
  const pages: ApexPageConfig[] = [...initialPages];
  if (pages.length > 0) {
    console.log("Tip: You can add/remove pages later by editing signaler.config.json or re-running init.");
    return pages;
  }
  while (true) {
    const shouldAdd = await confirmAddPage(pages.length > 0);
    if (!shouldAdd) {
      if (pages.length === 0) {
        console.log("At least one page is required.");
        continue;
      }
      return pages;
    }
    pages.push(await collectSinglePage());
  }
}

function isLikelyPublicStarterRoute(path: string): boolean {
  const lowered = path.toLowerCase();
  if (lowered.includes("/api")) return false;
  if (lowered.includes("/_next")) return false;
  if (lowered.includes("/__nuxt")) return false;
  if (lowered.includes("/__data")) return false;
  if (lowered.includes("/admin")) return false;
  if (lowered.includes("/auth")) return false;
  if (path.includes(":") || path.includes("[") || path.includes("]")) return false;
  return true;
}

function buildQuickStarterRoutes(routes: readonly DetectedRoute[]): readonly DetectedRoute[] {
  const unique = new Map<string, DetectedRoute>();
  for (const route of routes) {
    if (!unique.has(route.path)) {
      unique.set(route.path, route);
    }
  }
  const all: DetectedRoute[] = Array.from(unique.values());
  const home: DetectedRoute[] = all.filter((r) => r.path === "/");
  const publicStatic: DetectedRoute[] = all.filter((r) => r.path !== "/" && isLikelyPublicStarterRoute(r.path));
  const fallback: DetectedRoute[] = all.filter((r) => r.path !== "/" && !isLikelyPublicStarterRoute(r.path));
  return [...home, ...publicStatic, ...fallback].slice(0, QUICK_STARTER_MAX_ROUTES);
}

function printQuickPlan(pages: readonly ApexPageConfig[]): void {
  const combos: number = pages.reduce((sum, page) => sum + page.devices.length, 0);
  const lowMinutes: number = Math.max(1, Math.ceil((combos * 3) / 60));
  const highMinutes: number = Math.max(lowMinutes, Math.ceil((combos * 8) / 60));
  console.log("");
  console.log("Quick plan:");
  console.log(`  - Pages: ${pages.length}`);
  console.log(`  - Combos: ${combos} (mobile + desktop)`);
  console.log("  - Mode: throughput (recommended first run)");
  console.log(`  - Estimated runtime: ${lowMinutes}-${highMinutes} min`);
  console.log("  - Artifacts: .signaler/run.json, .signaler/results.json, .signaler/agent-index.json");
}

type DetectionResult = {
  readonly pages: readonly ApexPageConfig[];
  readonly detectedTotal: number;
  readonly excludedDynamic: readonly string[];
  readonly excludedByFilter: number;
  readonly excludedByScope: number;
  readonly scopeUsed: "quick" | "full" | "file" | "interactive";
  readonly warnings: readonly string[];
  readonly status: "ok" | "warn" | "error";
  readonly routeCap: number;
  readonly source: "filesystem" | "runtime" | "mixed" | "file";
};

async function maybeDetectPages(params: {
  readonly profile: ProjectProfileId;
  readonly baseUrl: string;
  readonly repoRoot: string;
  readonly mode: "quick" | "advanced";
  readonly scope: "quick" | "full" | "file" | undefined;
  readonly routesFile: string | undefined;
  readonly nonInteractive: boolean;
}): Promise<DetectionResult> {
  const routeCap: number = params.scope === "full" ? FULL_SCOPE_ROUTE_CAP : DEFAULT_ROUTE_CAP;
  if (params.scope === "file") {
    console.log("Scope 'file': using explicit route file input; dynamic routes are excluded from selection.");
    if (!params.routesFile) {
      const warning: string = "Scope 'file' selected but no --routes-file was provided.";
      console.log(`${warning} Add pages manually.`);
      return {
        pages: [],
        detectedTotal: 0,
        excludedDynamic: [],
        excludedByFilter: 0,
        excludedByScope: 0,
        scopeUsed: "file",
        warnings: [warning],
        status: params.nonInteractive ? "error" : "warn",
        routeCap,
        source: "file",
      };
    }
    try {
      const fileRoutes: readonly DetectedRoute[] = await readRoutesFromFile(params.routesFile);
      const deduped: readonly DetectedRoute[] = dedupeRoutes(fileRoutes);
      const excludedDynamic: readonly string[] = deduped.filter((route) => isDynamicRoutePath(route.path)).map((route) => route.path);
      const selected = deduped.filter((route) => !isDynamicRoutePath(route.path));
      console.log(`Loaded ${deduped.length} route(s) from file ${resolve(params.routesFile)}.`);
      if (excludedDynamic.length > 0) {
        console.log(`Excluded ${excludedDynamic.length} dynamic route(s) from file scope.`);
      }
      return {
        pages: selected.map(convertRouteToPage),
        detectedTotal: deduped.length,
        excludedDynamic,
        excludedByFilter: 0,
        excludedByScope: deduped.length - selected.length,
        scopeUsed: "file",
        warnings: excludedDynamic.length > 0 ? [`Excluded ${excludedDynamic.length} dynamic route(s) from file scope.`] : [],
        status: excludedDynamic.length > 0 ? "warn" : "ok",
        routeCap: deduped.length,
        source: "file",
      };
    } catch {
      const warning: string = `Could not read routes file ${params.routesFile}.`;
      console.log(`${warning} Add pages manually.`);
      return {
        pages: [],
        detectedTotal: 0,
        excludedDynamic: [],
        excludedByFilter: 0,
        excludedByScope: 0,
        scopeUsed: "file",
        warnings: [warning],
        status: params.nonInteractive ? "error" : "warn",
        routeCap,
        source: "file",
      };
    }
  }

  const preferredDetector = await selectDetector(params.profile, params.nonInteractive);
  if (params.scope === "quick") {
    console.log(`Scope 'quick': selecting starter subset for fast onboarding (route cap ${routeCap}).`);
  } else if (params.scope === "full") {
    console.log(`Scope 'full': selecting full static inventory (route cap ${routeCap}).`);
  }
  const repoRoot: string = params.repoRoot;
  if (!(await pathExists(repoRoot))) {
    console.log(`No project found at ${repoRoot}. Skipping auto-detection.`);
    return {
      pages: [],
      detectedTotal: 0,
      excludedDynamic: [],
      excludedByFilter: 0,
      excludedByScope: 0,
      scopeUsed: params.scope ?? "interactive",
      warnings: [`No project found at ${repoRoot}.`],
      status: "warn",
      routeCap,
      source: "filesystem",
    };
  }
  const detectionRoot = await chooseDetectionRoot({ profile: params.profile, repoRoot, nonInteractive: params.nonInteractive });
  const detectionLogs: RouteDetectionLogEntry[] = [];
  const filesystemRoutes: readonly DetectedRoute[] = await detectRoutes({
    projectRoot: detectionRoot,
    preferredDetectorId: preferredDetector,
    limit: routeCap,
    logger: { log(entry) { detectionLogs.push(entry); } },
  });
  const rustFallbackWarnings: readonly string[] = detectionLogs
    .filter((entry) => entry.detectorId === "rust-discovery" && entry.message.startsWith("fallback:"))
    .map((entry) => `Rust discovery fallback: ${entry.message.slice("fallback:".length).trim()}`);
  let runtimeAdded = 0;
  let combined: readonly DetectedRoute[] = filesystemRoutes;
  if (combined.length < routeCap) {
    const remaining: number = routeCap - combined.length;
    try {
      const runtimeRoutes: readonly string[] = await discoverRuntimeRoutes({ baseUrl: params.baseUrl, limit: remaining });
      combined = mergeRoutes({ primary: combined, secondaryPaths: runtimeRoutes });
      runtimeAdded = Math.max(0, combined.length - filesystemRoutes.length);
    } catch {
      combined = filesystemRoutes;
    }
  }
  const source: "filesystem" | "runtime" | "mixed" =
    filesystemRoutes.length === 0 && runtimeAdded > 0
      ? "runtime"
      : filesystemRoutes.length > 0 && runtimeAdded > 0
        ? "mixed"
        : "filesystem";
  if (combined.length === 0) {
    console.log("No routes detected. Add pages manually.");
    return {
      pages: [],
      detectedTotal: 0,
      excludedDynamic: [],
      excludedByFilter: 0,
      excludedByScope: 0,
      scopeUsed: params.scope ?? "interactive",
      warnings: ["No routes detected."],
      status: "warn",
      routeCap,
      source,
    };
  }
  const dedupedCombined: readonly DetectedRoute[] = dedupeRoutes(combined);
  const dynamicRoutes: readonly DetectedRoute[] = dedupedCombined.filter((route) => isDynamicRoutePath(route.path));
  const staticRoutes: readonly DetectedRoute[] = dedupedCombined.filter((route) => !isDynamicRoutePath(route.path));
  console.log(`Detected ${dedupedCombined.length} route(s) using auto-discovery.`);
  if (dynamicRoutes.length > 0) {
    console.log(`Excluded ${dynamicRoutes.length} dynamic route(s) ([slug]/param style).`);
  }

  if (params.scope === "quick") {
    const quickStarter: readonly DetectedRoute[] = buildQuickStarterRoutes(staticRoutes);
    return {
      pages: quickStarter.map(convertRouteToPage),
      detectedTotal: dedupedCombined.length,
      excludedDynamic: dynamicRoutes.map((route) => route.path),
      excludedByFilter: 0,
      excludedByScope: Math.max(0, staticRoutes.length - quickStarter.length),
      scopeUsed: "quick",
      warnings: [...rustFallbackWarnings],
      status: rustFallbackWarnings.length > 0 ? "warn" : "ok",
      routeCap,
      source,
    };
  }
  if (params.scope === "full") {
    return {
      pages: staticRoutes.map(convertRouteToPage),
      detectedTotal: dedupedCombined.length,
      excludedDynamic: dynamicRoutes.map((route) => route.path),
      excludedByFilter: 0,
      excludedByScope: 0,
      scopeUsed: "full",
      warnings: [...rustFallbackWarnings],
      status: rustFallbackWarnings.length > 0 ? "warn" : "ok",
      routeCap,
      source,
    };
  }

  if (params.mode === "quick") {
    const quickStarter: readonly DetectedRoute[] = buildQuickStarterRoutes(staticRoutes);
    if (quickStarter.length === 0) {
      console.log("No starter routes selected automatically. Add pages manually.");
      return {
        pages: [],
        detectedTotal: dedupedCombined.length,
        excludedDynamic: dynamicRoutes.map((route) => route.path),
        excludedByFilter: 0,
        excludedByScope: 0,
        scopeUsed: "interactive",
        warnings: ["No starter routes selected automatically."],
        status: "warn",
        routeCap,
        source,
      };
    }
    if (params.nonInteractive) {
      return {
        pages: quickStarter.map(convertRouteToPage),
        detectedTotal: dedupedCombined.length,
        excludedDynamic: dynamicRoutes.map((route) => route.path),
        excludedByFilter: 0,
        excludedByScope: Math.max(0, staticRoutes.length - quickStarter.length),
        scopeUsed: "interactive",
        warnings: [...rustFallbackWarnings],
        status: rustFallbackWarnings.length > 0 ? "warn" : "ok",
        routeCap,
        source,
      };
    }
    const useStarter = await ask<{ readonly value: boolean }>({
      type: "confirm",
      name: "value",
      message: `Use a quick starter set of ${quickStarter.length} route(s)?`,
      initial: true,
    });
    const picked: readonly DetectedRoute[] = useStarter.value ? quickStarter : staticRoutes;
    return {
      pages: picked.map(convertRouteToPage),
      detectedTotal: dedupedCombined.length,
      excludedDynamic: dynamicRoutes.map((route) => route.path),
      excludedByFilter: 0,
      excludedByScope: useStarter.value ? Math.max(0, staticRoutes.length - quickStarter.length) : 0,
      scopeUsed: "interactive",
      warnings: [...rustFallbackWarnings],
      status: rustFallbackWarnings.length > 0 ? "warn" : "ok",
      routeCap,
      source,
    };
  }
  const suggestedExclude: readonly string[] = buildSuggestedExcludePatterns(params.profile);
  const initialFilter: boolean = staticRoutes.length >= ROUTE_FILTER_DEFAULT_ON_THRESHOLD || suggestedExclude.length > 0;
  const confirmQuestion: PromptObject = { ...routeFilterConfirmQuestion, initial: initialFilter };
  const shouldFilter: RouteFilterConfirmAnswer = await ask<RouteFilterConfirmAnswer>(confirmQuestion);
  const filtered: readonly DetectedRoute[] = shouldFilter.value
    ? await filterDetectedRoutes({ routes: staticRoutes, profile: params.profile, suggestedExclude })
    : staticRoutes;
  if (filtered.length === 0) {
    console.log("No routes remain after filtering. Add pages manually.");
    return {
      pages: [],
      detectedTotal: dedupedCombined.length,
      excludedDynamic: dynamicRoutes.map((route) => route.path),
      excludedByFilter: staticRoutes.length,
      excludedByScope: 0,
      scopeUsed: "interactive",
      warnings: ["No routes remain after filtering."],
      status: "warn",
      routeCap,
      source,
    };
  }
  if (filtered.length !== staticRoutes.length) {
    console.log(`Filtered routes: ${filtered.length}/${staticRoutes.length}.`);
  }
  const selectedPages: readonly ApexPageConfig[] = await selectDetectedRoutes(filtered);
  const excludedByFilter: number = Math.max(0, staticRoutes.length - filtered.length);
  const excludedByScope: number = Math.max(0, filtered.length - selectedPages.length);
  return {
    pages: selectedPages,
    detectedTotal: dedupedCombined.length,
    excludedDynamic: dynamicRoutes.map((route) => route.path),
    excludedByFilter,
    excludedByScope,
    scopeUsed: "interactive",
    warnings: [...rustFallbackWarnings],
    status: rustFallbackWarnings.length > 0 ? "warn" : "ok",
    routeCap,
    source,
  };
}

async function filterDetectedRoutes(params: { readonly routes: readonly DetectedRoute[]; readonly profile: ProjectProfileId; readonly suggestedExclude: readonly string[] }): Promise<readonly DetectedRoute[]> {
  const questions: readonly PromptObject[] = buildRouteFilterQuestions({ profile: params.profile, suggestedExclude: params.suggestedExclude });
  const answers: RouteFilterAnswer = await ask<RouteFilterAnswer>(questions);
  const includePatterns: readonly string[] = splitPatterns(answers.include);
  const excludePatterns: readonly string[] = splitPatterns(answers.exclude);
  const includeRegexes: readonly RegExp[] = includePatterns.map((pattern) => compileGlob(pattern));
  const excludeRegexes: readonly RegExp[] = excludePatterns.map((pattern) => compileGlob(pattern));
  return params.routes.filter((route) => {
    const included: boolean = includeRegexes.length === 0 ? true : includeRegexes.some((regex) => regex.test(route.path));
    const excluded: boolean = excludeRegexes.some((regex) => regex.test(route.path));
    return included && !excluded;
  });
}

function splitPatterns(raw: string): readonly string[] {
  return raw
    .split(",")
    .map((part) => part.trim())
    .filter((part) => part.length > 0);
}

function compileGlob(pattern: string): RegExp {
  const escaped: string = pattern.replace(/[.+^${}()|[\]\\]/g, "\\$&");
  const wildcarded: string = escaped.replace(/\*/g, ".*").replace(/\?/g, ".");
  return new RegExp(`^${wildcarded}$`);
}

async function chooseDetectionRoot({
  profile,
  repoRoot,
  nonInteractive,
}: {
  readonly profile: ProjectProfileId;
  readonly repoRoot: string;
  readonly nonInteractive?: boolean;
}): Promise<string> {
  const candidates: readonly MonorepoCandidate[] = await findMonorepoCandidates(repoRoot);
  const matching: readonly MonorepoCandidate[] = candidates.filter((candidate) => candidate.profile === profile);
  if (matching.length === 0) {
    if (profile !== "next") {
      return repoRoot;
    }
    const projects: readonly DiscoveredProject[] = await discoverNextProjects({ repoRoot });
    if (projects.length === 0) {
      return repoRoot;
    }
    if (projects.length === 1) {
      const onlyProject = projects[0] as DiscoveredProject;
      console.log(`Detected Next.js app at ${onlyProject.root}.`);
      return onlyProject.root;
    }
    if (nonInteractive) {
      const selected = projects[0] as DiscoveredProject;
      console.log(`Non-interactive mode selected first detected app: ${selected.root}`);
      return selected.root;
    }
    const choices = projects.map((project) => ({
      title: `${project.name} (${project.root})`,
      value: project.root,
    }));
    const answer = await ask<ProjectSelectionAnswer>({
      type: "select",
      name: "projectRoot",
      message: "Multiple Next.js apps found. Which one do you want to audit?",
      choices,
    });
    return answer.projectRoot ?? repoRoot;
  }
  if (matching.length === 1) {
    const only: MonorepoCandidate = matching[0] as MonorepoCandidate;
    console.log(`Detected ${profileDisplayName(profile)} app at ${only.root}.`);
    return only.root;
  }
  if (nonInteractive) {
    const selected = matching[0] as MonorepoCandidate;
    console.log(`Non-interactive mode selected first matching app: ${selected.root}`);
    return selected.root;
  }
  const choices = matching.map((candidate) => ({
    title: `${candidate.name} (${candidate.root}) - ${profileDisplayName(candidate.profile)}`,
    value: candidate.root,
  }));
  const answer = await ask<ProjectSelectionAnswer>({
    type: "select",
    name: "projectRoot",
    message: `Multiple ${profileDisplayName(profile)} apps found. Which one do you want to audit?`,
    choices,
  });
  return answer.projectRoot ?? matching[0]?.root ?? repoRoot;
}

async function selectDetector(profile: ProjectProfileId, nonInteractive: boolean): Promise<RouteDetectorId | undefined> {
  const preset = PROFILE_TO_DETECTOR[profile];
  if (preset) {
    return preset;
  }
  if (nonInteractive) {
    return undefined;
  }
  const choice = await ask<DetectorChoiceAnswer>(detectorChoiceQuestion);
  return choice.detector;
}

async function selectDetectedRoutes(routes: readonly DetectedRoute[]): Promise<ApexPageConfig[]> {
  const response = await ask<RouteSelectionAnswer>(
    {
      type: "multiselect",
      name: "indexes",
      message: "Select routes to include",
      instructions: true,
      hint: "Use Space to toggle, ↑/↓ to move, and Enter to confirm.",
      min: 1,
      choices: buildRouteChoices(routes),
    },
  );
  const indexes = response.indexes ?? [];
  const selected = indexes.map((index) => routes[index]).filter(Boolean);
  return selected.map((route) => ({
    path: route.path,
    label: route.label,
    devices: DEFAULT_DEVICES,
  }));
}

function buildRouteChoices(routes: readonly DetectedRoute[]): { title: string; value: number; selected: boolean }[] {
  return routes.map((route, index) => ({
    title: `${route.path} (${route.source})`,
    value: index,
    selected: index < DEFAULT_PRESELECT_COUNT,
  }));
}

function convertRouteToPage(route: DetectedRoute): ApexPageConfig {
  return {
    path: route.path,
    label: route.label,
    devices: DEFAULT_DEVICES,
  };
}

function isDynamicRoutePath(path: string): boolean {
  return path.includes(":") || path.includes("[") || path.includes("]");
}

function dedupeRoutes(routes: readonly DetectedRoute[]): readonly DetectedRoute[] {
  const unique = new Map<string, DetectedRoute>();
  for (const route of routes) {
    if (!unique.has(route.path)) {
      unique.set(route.path, route);
    }
  }
  return Array.from(unique.values());
}

async function readRoutesFromFile(path: string): Promise<readonly DetectedRoute[]> {
  const absolute: string = resolve(path);
  const raw: string = await readFile(absolute, "utf8");
  const lines: readonly string[] = raw.split(/\r?\n/g).map((line) => line.trim()).filter((line) => line.length > 0 && !line.startsWith("#"));
  const normalized: readonly string[] = lines.map((line) => (line.startsWith("/") ? line : `/${line}`));
  const unique: readonly string[] = Array.from(new Set(normalized));
  return unique.map((routePath) => ({ path: routePath, label: buildLabel(routePath), source: "manual" as const }));
}

export function buildDiscoverySummary(params: {
  readonly repoRoot: string;
  readonly baseUrl: string;
  readonly scopeRequested: "quick" | "full" | "file" | "interactive";
  readonly scopeUsed: "quick" | "full" | "file" | "interactive";
  readonly detectedTotal: number;
  readonly pages: readonly ApexPageConfig[];
  readonly excludedDynamic: readonly string[];
  readonly excludedByFilter: number;
  readonly excludedByScope: number;
  readonly status: "ok" | "warn" | "error";
  readonly warnings?: readonly string[];
  readonly routeCap: number;
  readonly source: "filesystem" | "runtime" | "mixed" | "file";
}): DiscoverySummary {
  return {
    generatedAt: new Date().toISOString(),
    scope: params.scopeUsed,
    scopeRequested: params.scopeRequested,
    scopeResolved: params.scopeUsed,
    status: params.status,
    warnings: params.warnings?.length ? params.warnings : undefined,
    repoRoot: params.repoRoot,
    baseUrl: params.baseUrl,
    totals: {
      detected: params.detectedTotal,
      selected: params.pages.length,
      excludedDynamic: params.excludedDynamic.length,
      excludedByFilter: params.excludedByFilter,
      excludedByScope: params.excludedByScope,
    },
    routes: {
      selected: params.pages.map((page) => page.path),
      excludedDynamic: params.excludedDynamic,
    },
    strategy: {
      routeCap: params.routeCap,
      source: params.source,
    },
  };
}

async function writeDiscoverySummary(params: { readonly configPath: string; readonly summary: DiscoverySummary }): Promise<void> {
  const signalerDir: string = resolve(dirname(params.configPath), ".signaler");
  await mkdir(signalerDir, { recursive: true });
  const discoveryPath: string = resolve(signalerDir, "discovery.json");
  await writeFile(discoveryPath, `${JSON.stringify(params.summary, null, 2)}\n`, "utf8");
  console.log(`Saved discovery summary to ${discoveryPath}`);
}

function printDiscoveryStrategySummary(summary: DiscoverySummary): void {
  const warnings: readonly string[] = summary.warnings ?? [];
  const warningText: string = warnings.length === 0 ? "none" : warnings.join(" | ");
  console.log("");
  console.log("Discovery summary:");
  console.log(`  - scope: requested=${summary.scopeRequested}, resolved=${summary.scopeResolved}`);
  console.log(`  - status: ${summary.status}`);
  console.log(`  - totals: detected=${summary.totals.detected}, selected=${summary.totals.selected}, excludedDynamic=${summary.totals.excludedDynamic}, excludedByFilter=${summary.totals.excludedByFilter}, excludedByScope=${summary.totals.excludedByScope}`);
  console.log(`  - strategy: source=${summary.strategy.source}, routeCap=${summary.strategy.routeCap}`);
  console.log(`  - warnings: ${warningText}`);
}

async function writeDiscoveryFailureSummary(params: {
  readonly configPath: string;
  readonly baseUrl: string;
  readonly repoRoot: string;
  readonly scopeRequested: "quick" | "full" | "file" | "interactive";
  readonly warning: string;
}): Promise<void> {
  const summary: DiscoverySummary = {
    generatedAt: new Date().toISOString(),
    scope: params.scopeRequested,
    scopeRequested: params.scopeRequested,
    scopeResolved: params.scopeRequested,
    status: "error",
    warnings: [params.warning],
    repoRoot: params.repoRoot,
    baseUrl: params.baseUrl,
    totals: {
      detected: 0,
      selected: 0,
      excludedDynamic: 0,
      excludedByFilter: 0,
      excludedByScope: 0,
    },
    routes: {
      selected: [],
      excludedDynamic: [],
    },
    strategy: {
      routeCap: 0,
      source: params.scopeRequested === "file" ? "file" : "filesystem",
    },
  };
  await writeDiscoverySummary({ configPath: params.configPath, summary });
  printDiscoveryStrategySummary(summary);
}

async function buildConfigAndDiscoveryForMode(params: {
  readonly mode: "quick" | "advanced";
  readonly scope: "quick" | "full" | "file" | undefined;
  readonly routesFile: string | undefined;
  readonly baseUrl: string | undefined;
  readonly projectRoot: string | undefined;
  readonly profile: ProjectProfileId | undefined;
  readonly yes: boolean;
  readonly nonInteractive: boolean;
}): Promise<{ readonly config: ApexConfig; readonly discovery: DiscoverySummary }> {
  const suggestedBaseUrl: string = await detectLikelyBaseUrl();
  let baseAnswers: BaseAnswers;
  if (params.baseUrl && params.baseUrl.trim().length > 0) {
    baseAnswers = { baseUrl: params.baseUrl.trim(), query: undefined };
  } else if (params.nonInteractive) {
    baseAnswers = { baseUrl: suggestedBaseUrl, query: undefined };
  } else if (params.mode === "quick") {
    const useSuggested = await ask<{ readonly value: boolean }>({
      type: "confirm",
      name: "value",
      message: `Use detected base URL ${suggestedBaseUrl}?`,
      initial: true,
    });
    baseAnswers = useSuggested.value
      ? { baseUrl: suggestedBaseUrl, query: undefined }
      : await collectBaseAnswersWithSafety({ initialBaseUrl: suggestedBaseUrl, includeQuery: false });
  } else {
    baseAnswers = await collectBaseAnswersWithSafety({ initialBaseUrl: suggestedBaseUrl, includeQuery: true });
  }
  const initialRepoRoot: string = params.projectRoot && params.projectRoot.trim().length > 0
    ? resolve(params.projectRoot)
    : params.nonInteractive
      ? resolve(DEFAULT_PROJECT_ROOT)
      : await resolveProjectRootForWizard(params.mode);
  const resolved = await resolveWizardProjectRoot(initialRepoRoot, { nonInteractive: params.nonInteractive });
  const repoRoot: string = resolved.repoRoot;
  const detectedProfile: ProjectProfileId | undefined = params.profile ?? resolved.detectedProfile;
  if (detectedProfile) {
    const useDetectedProfile: boolean = params.nonInteractive
      ? true
      : params.mode === "quick"
      ? true
      : (await ask<{ readonly value: boolean }>({
        type: "confirm",
        name: "value",
        message: `Detected ${profileDisplayName(detectedProfile)} from package.json. Use this?`,
        initial: true,
      })).value;
    if (useDetectedProfile) {
      console.log("Tip: parallel workers auto-tune from CPU/memory. Override later with --parallel <n> or inspect with --show-parallel.");
      const detected = await maybeDetectPages({
        profile: detectedProfile,
        baseUrl: baseAnswers.baseUrl,
        repoRoot,
        mode: params.mode,
        scope: params.scope,
        routesFile: params.routesFile,
        nonInteractive: params.nonInteractive,
      });
      const pages = params.nonInteractive ? [...detected.pages] : await collectPages(detected.pages);
      if (params.mode === "quick") {
        printQuickPlan(pages);
      }
      const config: ApexConfig = {
        baseUrl: baseAnswers.baseUrl,
        query: baseAnswers.query,
        runs: 1,
        pages,
      };
      const discovery: DiscoverySummary = buildDiscoverySummary({
        repoRoot,
        baseUrl: baseAnswers.baseUrl,
        scopeRequested: params.scope ?? "interactive",
        scopeUsed: detected.scopeUsed,
        detectedTotal: detected.detectedTotal,
        pages,
        excludedDynamic: detected.excludedDynamic,
        excludedByFilter: detected.excludedByFilter,
        excludedByScope: Math.max(0, detected.excludedByScope + Math.max(0, detected.pages.length - pages.length)),
        status: detected.status,
        warnings: detected.warnings,
        routeCap: detected.routeCap,
        source: detected.source,
      });
      return { config, discovery };
    }
  }
  const profileAnswer = params.nonInteractive
    ? { profile: detectedProfile ?? "custom" as ProjectProfileId }
    : await ask<ProjectProfileAnswer>(buildProfileQuestion({ detectedProfile }));
  console.log("Tip: parallel workers auto-tune from CPU/memory. Override later with --parallel <n> or inspect with --show-parallel.");
  const detected = await maybeDetectPages({
    profile: profileAnswer.profile,
    baseUrl: baseAnswers.baseUrl,
    repoRoot,
    mode: params.mode,
    scope: params.scope,
    routesFile: params.routesFile,
    nonInteractive: params.nonInteractive,
  });
  const pages = params.nonInteractive ? [...detected.pages] : await collectPages(detected.pages);
  if (params.mode === "quick") {
    printQuickPlan(pages);
  }
  const config: ApexConfig = {
    baseUrl: baseAnswers.baseUrl,
    query: baseAnswers.query,
    runs: 1,
    pages,
  };
  const discovery: DiscoverySummary = buildDiscoverySummary({
    repoRoot,
    baseUrl: baseAnswers.baseUrl,
    scopeRequested: params.scope ?? "interactive",
    scopeUsed: detected.scopeUsed,
    detectedTotal: detected.detectedTotal,
    pages,
    excludedDynamic: detected.excludedDynamic,
    excludedByFilter: detected.excludedByFilter,
    excludedByScope: Math.max(0, detected.excludedByScope + Math.max(0, detected.pages.length - pages.length)),
    status: detected.status,
    warnings: detected.warnings,
    routeCap: detected.routeCap,
    source: detected.source,
  });
  return { config, discovery };
}

/**
 * Run the interactive configuration wizard CLI.
 */
export async function runWizardCli(argv: readonly string[]): Promise<void> {
  let parsedArgs: WizardArgs | undefined;
  let absolutePath = resolve("signaler.config.json");
  let fallbackBaseUrl: string = DEFAULT_BASE_URL;
  let fallbackRepoRoot = resolve(DEFAULT_PROJECT_ROOT);
  try {
    const args = parseWizardArgs(argv);
    parsedArgs = args;
    absolutePath = resolve(args.configPath);
    if (args.baseUrl && args.baseUrl.trim().length > 0) {
      fallbackBaseUrl = args.baseUrl.trim();
    }
    if (args.projectRoot && args.projectRoot.trim().length > 0) {
      fallbackRepoRoot = resolve(args.projectRoot);
    }
    if (args.nonInteractive && args.scope === "file" && (!args.routesFile || args.routesFile.trim().length === 0)) {
      await writeDiscoveryFailureSummary({
        configPath: absolutePath,
        baseUrl: fallbackBaseUrl,
        repoRoot: fallbackRepoRoot,
        scopeRequested: "file",
        warning: "Non-interactive discovery with --scope file requires --routes-file.",
      });
      throw new Error("Missing required --routes-file for non-interactive file scope.");
    }
    await ensureWritable(absolutePath, { nonInteractive: args.nonInteractive, yes: args.yes });
    const built = await buildConfigAndDiscoveryForMode({
      mode: args.nonInteractive ? "quick" : args.mode,
      scope: args.scope,
      routesFile: args.routesFile,
      baseUrl: args.baseUrl,
      projectRoot: args.projectRoot,
      profile: args.profile,
      yes: args.yes,
      nonInteractive: args.nonInteractive,
    });
    const config = built.config;
    if (args.nonInteractive && config.pages.length === 0) {
      throw new Error("Non-interactive discovery produced zero selected routes. Provide --scope/--routes-file or valid filters.");
    }
    await writeFile(absolutePath, `${JSON.stringify(config, null, 2)}\n`, "utf8");
    console.log(`Saved Signaler config to ${absolutePath}`);
    await writeDiscoverySummary({ configPath: absolutePath, summary: built.discovery });
    printDiscoveryStrategySummary(built.discovery);
    const runNow: boolean = args.runAfterInit
      ? true
      : args.nonInteractive
        ? false
      : (await ask<{ readonly value: boolean }>({
        type: "confirm",
        name: "value",
        message: "Run first audit now with canonical defaults? (run --contract v3 --mode throughput)",
        initial: true,
      })).value;
    if (runNow) {
      const { runAuditCli } = await import("./cli.js");
      await runAuditCli(["node", "signaler", "run", "--config", absolutePath, "--contract", "v3", "--mode", "throughput", "--yes"]);
    } else {
      console.log(`Next step: signaler run --config "${absolutePath}" --contract v3 --mode throughput`);
    }
  } catch (error: unknown) {
    if (error instanceof WizardAbortError) {
      return;
    }
    if (parsedArgs) {
      const warning: string = error instanceof Error ? error.message : String(error);
      await writeDiscoveryFailureSummary({
        configPath: absolutePath,
        baseUrl: fallbackBaseUrl,
        repoRoot: fallbackRepoRoot,
        scopeRequested: parsedArgs.scope ?? "interactive",
        warning,
      });
    }
    throw error;
  }
}
