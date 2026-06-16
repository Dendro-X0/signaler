import { resolve } from "node:path";
import type { ApexAuthConfig, ApexAuthProfileConfig, ApexConfig, ApexPageConfig } from "../core/types.js";
import { resolveAuditAuthCookieHeader, mergeCookieHeaders, buildLighthouseExtraHeaders } from "../runners/lighthouse/auth-session.js";
import type { AuditAuthSession, LabAuthMode, LabAuthPlan, PrepareLabAuthParams } from "./types.js";
import { assertLocalLabAuth } from "./local-url.js";
import { runAuthLoginPlaywright } from "./auth-login-playwright.js";
import { validateLabAuthProbe } from "./validate-probe.js";

const DEFAULT_PROTECTED_PREFIXES = ["/dashboard/", "/admin/", "/account/"] as const;
const DEFAULT_COOKIE_FILE = ".signaler/audit.cookies.txt";

function sessionFromProfile(profile: ApexAuthProfileConfig, params: {
  readonly baseUrl: string;
  readonly configDir: string;
}): Promise<AuditAuthSession> {
  return resolveAuditAuthSession({
    auth: {
      cookies: profile.cookies,
      cookieFile: profile.cookieFile,
      warmupUrl: profile.warmupUrl,
      headers: profile.headers,
    },
    baseUrl: params.baseUrl,
    configDir: params.configDir,
  });
}

export async function resolveAuditAuthSession(params: {
  readonly auth?: ApexAuthConfig;
  readonly baseUrl: string;
  readonly configDir: string;
}): Promise<AuditAuthSession> {
  const cookieHeader = await resolveAuditAuthCookieHeader({
    auth: params.auth,
    baseUrl: params.baseUrl,
    configDir: params.configDir,
  });
  const headers = buildLighthouseExtraHeaders({
    cookieHeader,
    headers: params.auth?.headers,
  });
  if (!cookieHeader && !headers) {
    return {};
  }
  return {
    ...(cookieHeader ? { cookieHeader } : {}),
    ...(headers ? { headers } : {}),
  };
}

function resolveProtectedPrefixes(auth?: ApexAuthConfig): readonly string[] {
  if (auth?.protectedPathPrefixes && auth.protectedPathPrefixes.length > 0) {
    return auth.protectedPathPrefixes;
  }
  return DEFAULT_PROTECTED_PREFIXES;
}

function detectAuthMode(auth: ApexAuthConfig | undefined, hasProfiles: boolean): LabAuthMode {
  if (!auth) {
    return "none";
  }
  if (hasProfiles) {
    return "profiles";
  }
  if (auth.login) {
    return "login";
  }
  if (auth.warmupUrl) {
    return "warmup";
  }
  if (auth.cookieFile) {
    return "cookie-file";
  }
  if (auth.cookies) {
    return "cookies";
  }
  return "none";
}

function hasResolvableCookies(auth?: ApexAuthConfig): boolean {
  if (!auth) {
    return false;
  }
  if (auth.cookies?.trim()) {
    return true;
  }
  if (auth.cookieFile?.trim()) {
    return true;
  }
  if (auth.warmupUrl?.trim()) {
    return true;
  }
  if (auth.profiles && Object.keys(auth.profiles).length > 0) {
    return true;
  }
  return false;
}

function resolveDefaultProbePath(params: {
  readonly auth?: ApexAuthConfig;
  readonly pages?: readonly ApexPageConfig[];
  readonly protectedPathPrefixes: readonly string[];
}): string | undefined {
  if (params.auth?.probePath) {
    return params.auth.probePath;
  }
  const requiresAuth = params.pages?.find((page) => page.scope === "requires-auth");
  if (requiresAuth) {
    return requiresAuth.path;
  }
  const protectedPages = (params.pages ?? [])
    .filter((page) => params.protectedPathPrefixes.some((prefix) => {
      const normalized = prefix.replace(/\/$/, "");
      return page.path.startsWith(prefix) && page.path.length > normalized.length;
    }))
    .sort((left, right) => right.path.length - left.path.length);
  if (protectedPages[0]) {
    return protectedPages[0].path;
  }
  return params.protectedPathPrefixes
    .map((prefix) => prefix.replace(/\/$/, ""))
    .find((path) => path.length > 1);
}

export async function prepareLabAuth(params: PrepareLabAuthParams): Promise<LabAuthPlan> {
  const auth = params.config.auth;
  const labEnabled = Boolean(params.labAuthFlag || auth?.lab);
  const protectedPathPrefixes = resolveProtectedPrefixes(auth);
  const probePath = resolveDefaultProbePath({
    auth,
    pages: params.pages,
    protectedPathPrefixes,
  });

  if (!auth && !labEnabled) {
    return {
      enabled: false,
      mode: "none",
      defaultSession: {},
      profileSessions: {},
      protectedPathPrefixes,
      probePath,
    };
  }

  if (labEnabled) {
    assertLocalLabAuth(params.config.baseUrl);
  }

  let effectiveAuth = auth;
  if (
    params.autoLogin !== false
    && auth?.login
    && !hasResolvableCookies(auth)
    && labEnabled
  ) {
    const cookieFile = auth.cookieFile ?? DEFAULT_COOKIE_FILE;
    await runAuthLoginPlaywright({
      baseUrl: params.config.baseUrl,
      login: auth.login,
      cookieOutPath: resolve(params.configDir, cookieFile),
    });
    effectiveAuth = { ...auth, cookieFile };
  }

  const profileEntries = effectiveAuth?.profiles ? Object.entries(effectiveAuth.profiles) : [];
  const profileSessions: Record<string, AuditAuthSession> = {};
  for (const [name, profile] of profileEntries) {
    profileSessions[name] = await sessionFromProfile(profile, {
      baseUrl: params.config.baseUrl,
      configDir: params.configDir,
    });
  }

  const defaultSession = await resolveAuditAuthSession({
    auth: effectiveAuth,
    baseUrl: params.config.baseUrl,
    configDir: params.configDir,
  });

  const mode = detectAuthMode(effectiveAuth, profileEntries.length > 0);
  let probeValidated: boolean | undefined;
  if (labEnabled && probePath) {
    const probeSession = mergeSessions(defaultSession, pickFirstProfileSession(profileSessions));
    probeValidated = await validateLabAuthProbe({
      baseUrl: params.config.baseUrl,
      probePath,
      session: probeSession,
      protectedPathPrefixes,
    });
    if (!probeValidated) {
      throw new Error(
        `Lab auth probe failed for ${probePath}. Check auth.warmupUrl, serveEnv lab bypass flags, or run: signaler auth login --config signaler.config.json`,
      );
    }
  }

  return {
    enabled: labEnabled || mode !== "none",
    mode,
    defaultSession,
    profileSessions,
    protectedPathPrefixes,
    probePath,
    probeValidated,
  };
}

export function mergeSessions(...sessions: readonly AuditAuthSession[]): AuditAuthSession {
  let cookieHeader: string | undefined;
  const headerJar: Record<string, string> = {};
  for (const session of sessions) {
    cookieHeader = mergeCookieHeaders(cookieHeader, session.cookieHeader);
    if (session.headers) {
      for (const [key, value] of Object.entries(session.headers)) {
        headerJar[key] = value;
      }
    }
  }
  const headers = Object.keys(headerJar).length > 0 ? headerJar : undefined;
  if (!cookieHeader && !headers) {
    return {};
  }
  return {
    ...(cookieHeader ? { cookieHeader } : {}),
    ...(headers ? { headers } : {}),
  };
}

function pickFirstProfileSession(
  profileSessions: Readonly<Record<string, AuditAuthSession>>,
): AuditAuthSession {
  const first = Object.values(profileSessions)[0];
  return first ?? {};
}

export function resolveSessionForPage(params: {
  readonly plan: LabAuthPlan;
  readonly authProfile?: string;
}): AuditAuthSession {
  if (params.authProfile && params.plan.profileSessions[params.authProfile]) {
    return mergeSessions(params.plan.defaultSession, params.plan.profileSessions[params.authProfile]!);
  }
  return params.plan.defaultSession;
}
