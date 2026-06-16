import { resolve, dirname } from "node:path";
import { loadConfig } from "./core/config.js";
import { runAuthLoginPlaywright } from "./lab-auth/auth-login-playwright.js";
import { prepareLabAuth } from "./lab-auth/resolve-auth-session.js";
import { probeAuthPath } from "./lab-auth/validate-probe.js";
import { formatPreflightSkipMessage } from "./runners/lighthouse/route-preflight.js";

type AuthCliArgs = {
  readonly subcommand: "login" | "probe";
  readonly configPath: string;
  readonly baseUrl?: string;
  readonly probePath?: string;
  readonly labAuth: boolean;
  readonly json: boolean;
};

function normalizeRoutePathArg(raw: string): string {
  const trimmed = raw.trim();
  if (trimmed.startsWith("/")) {
    return trimmed;
  }
  const fromWindowsMsys = trimmed.match(/[/\\](dashboard(?:[/\\].*)?)$/i);
  if (fromWindowsMsys) {
    return `/${fromWindowsMsys[1]!.replace(/\\/g, "/")}`;
  }
  return trimmed.startsWith("/") ? trimmed : `/${trimmed}`;
}

function parseAuthCliArgs(argv: readonly string[]): AuthCliArgs {
  const subcommand = argv[2];
  if (subcommand !== "login" && subcommand !== "probe") {
    throw new Error(`Unknown auth subcommand: ${subcommand ?? "(missing)"}. Use: signaler auth login | probe`);
  }
  let configPath = "signaler.config.json";
  let baseUrl: string | undefined;
  let probePath: string | undefined;
  let labAuth = false;
  let json = false;
  for (let i = 3; i < argv.length; i += 1) {
    const arg = argv[i] ?? "";
    if ((arg === "--config" || arg === "-c") && i + 1 < argv.length) {
      configPath = argv[i + 1] ?? configPath;
      i += 1;
      continue;
    }
    if (arg === "--base-url" && i + 1 < argv.length) {
      baseUrl = argv[i + 1];
      i += 1;
      continue;
    }
    if (arg === "--path" && i + 1 < argv.length) {
      probePath = normalizeRoutePathArg(argv[i + 1] ?? "");
      i += 1;
      continue;
    }
    if (arg === "--lab-auth") {
      labAuth = true;
      continue;
    }
    if (arg === "--json") {
      json = true;
    }
  }
  return { subcommand, configPath, baseUrl, probePath, labAuth, json };
}

export async function runAuthCli(argv: readonly string[]): Promise<void> {
  const args = parseAuthCliArgs(argv);
  const loaded = await loadConfig({ configPath: args.configPath });
  const configPath = resolve(args.configPath);
  const configDir = dirname(configPath);
  const config = {
    ...loaded.config,
    ...(args.baseUrl ? { baseUrl: args.baseUrl } : {}),
  };

  if (args.subcommand === "login") {
    const login = config.auth?.login;
    if (!login) {
      throw new Error("auth.login is not configured in signaler.config.json");
    }
    const cookieFile = config.auth?.cookieFile ?? ".signaler/audit.cookies.txt";
    const cookieOutPath = resolve(configDir, cookieFile);
    await runAuthLoginPlaywright({
      baseUrl: config.baseUrl,
      login,
      cookieOutPath,
    });
    if (args.json) {
      console.log(JSON.stringify({ ok: true, cookieFile, cookieOutPath }, null, 2));
    } else {
      console.log(`Wrote session cookies to ${cookieOutPath}`);
    }
    return;
  }

  const plan = await prepareLabAuth({
    config,
    configDir,
    labAuthFlag: args.labAuth || config.auth?.lab,
    pages: config.pages,
    autoLogin: false,
  });
  const path = args.probePath ?? plan.probePath;
  if (!path) {
    throw new Error("Probe path required: --path /dashboard/... or configure auth.probePath");
  }
  const session = plan.defaultSession;
  const result = await probeAuthPath({
    baseUrl: config.baseUrl,
    path,
    session,
    protectedPathPrefixes: plan.protectedPathPrefixes,
  });
  if (args.json) {
    console.log(JSON.stringify({ path, status: result.status, httpStatus: result.httpStatus, reason: result.reason }, null, 2));
  } else if (result.status === "ok") {
    console.log(`Probe OK: ${path} (HTTP ${result.httpStatus ?? "?"})`);
  } else {
    console.error(formatPreflightSkipMessage(result));
    process.exitCode = 1;
  }
}
