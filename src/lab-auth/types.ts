import type { ApexAuthConfig, ApexConfig, ApexPageConfig } from "../core/types.js";

export type AuditAuthSession = {
  readonly cookieHeader?: string;
  readonly headers?: Readonly<Record<string, string>>;
};

export type LabAuthMode = "none" | "cookies" | "cookie-file" | "warmup" | "login" | "profiles";

export type LabAuthPlan = {
  readonly enabled: boolean;
  readonly mode: LabAuthMode;
  readonly defaultSession: AuditAuthSession;
  readonly profileSessions: Readonly<Record<string, AuditAuthSession>>;
  readonly protectedPathPrefixes: readonly string[];
  readonly probePath?: string;
  readonly probeValidated?: boolean;
};

export type PrepareLabAuthParams = {
  readonly config: ApexConfig;
  readonly configDir: string;
  readonly labAuthFlag?: boolean;
  readonly pages?: readonly ApexPageConfig[];
  readonly autoLogin?: boolean;
};

export type ResolvedAuthContext = {
  readonly auth?: ApexAuthConfig;
  readonly labEnabled: boolean;
};
