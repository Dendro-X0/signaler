/**
 * Lab-only environment variables Signaler may inject into its **managed serve child process**.
 *
 * Security model:
 * - Signaler is an **offline, local** tool. Injection applies only to a child process Signaler
 *   spawns on loopback (127.0.0.1) during your audit — never to remote hosts.
 * - Values are **never written** to project `.env`, `.env.local`, or git-tracked files.
 * - When Signaler started the server, the child is **stopped** after the audit (cleanup).
 * - Injection helps audit **protected routes** without weakening production deployments.
 */

export type ServeEnvSource = "process" | "inferred" | "config" | "cli";

export type ServeEnvEntry = {
  readonly key: string;
  readonly value: string;
  readonly source: ServeEnvSource;
  readonly purpose: string;
};

export type ServeEnvPlan = {
  readonly entries: readonly ServeEnvEntry[];
  readonly merged: Readonly<Record<string, string>>;
  readonly hasInferred: boolean;
};

const KEY_PURPOSE: Readonly<Record<string, string>> = {
  DEMO_AUTH_BYPASS:
    "Enables the app's documented audit-lab auth bypass so protected pages can be scored locally.",
  SIGNALER_AUDIT_MODE:
    "Signals audit-lab mode to apps that gate features when this flag is set.",
  AUDIT_BYPASS:
    "Generic audit bypass flag used by some templates during local quality runs.",
};

export const SERVE_ENV_SECURITY_NOTICE = [
  "Signaler lab environment (offline, local only)",
  "",
  "• Scope: injected only into Signaler's managed serve child on 127.0.0.1 — not your repo files.",
  "• Purpose: score protected routes during a local audit without editing committed .env files.",
  "• Cleanup: when Signaler starts the server, it stops that process when the audit finishes.",
  "• Remote: Signaler does not inject into remote URLs or use this for intrusion — loopback labs only.",
  "• Opt out: decline this prompt, use --no-audit-bypass, or run with --no-managed-serve.",
].join("\n");

function purposeForKey(key: string): string {
  return KEY_PURPOSE[key] ?? "Audit-lab environment variable for local managed serve.";
}

function pushEntry(
  entries: ServeEnvEntry[],
  seen: Set<string>,
  key: string,
  value: string,
  source: ServeEnvSource,
): void {
  if (!key || !value || seen.has(key)) return;
  seen.add(key);
  entries.push({ key, value, source, purpose: purposeForKey(key) });
}

export function buildServeEnvPlan(params: {
  readonly fromProcess?: Readonly<Record<string, string>>;
  readonly inferred?: Readonly<Record<string, string>>;
  readonly fromConfig?: Readonly<Record<string, string>>;
  readonly fromCli?: Readonly<Record<string, string>>;
}): ServeEnvPlan {
  const entries: ServeEnvEntry[] = [];
  const seen = new Set<string>();
  const merged: Record<string, string> = {};

  const layers: ReadonlyArray<{ source: ServeEnvSource; map?: Readonly<Record<string, string>> }> = [
    { source: "process", map: params.fromProcess },
    { source: "inferred", map: params.inferred },
    { source: "config", map: params.fromConfig },
    { source: "cli", map: params.fromCli },
  ];

  for (const layer of layers) {
    if (!layer.map) continue;
    for (const [key, value] of Object.entries(layer.map)) {
      pushEntry(entries, seen, key, value, layer.source);
      merged[key] = value;
    }
  }

  return {
    entries,
    merged,
    hasInferred: entries.some((e) => e.source === "inferred"),
  };
}

export function formatServeEnvDisclosure(plan: ServeEnvPlan): string {
  const lines: string[] = [
    SERVE_ENV_SECURITY_NOTICE,
    "",
    "Proposed injection (managed serve child only):",
  ];
  if (plan.entries.length === 0) {
    lines.push("  (none)");
    return lines.join("\n");
  }
  for (const entry of plan.entries) {
    lines.push(`  ${entry.key}=${entry.value}  [${entry.source}]`);
    lines.push(`    → ${entry.purpose}`);
  }
  lines.push("");
  lines.push(
    "Injecting these variables can help audit all routes (including auth-gated pages) during this local run.",
  );
  return lines.join("\n");
}

export function stripInferredEntries(plan: ServeEnvPlan): ServeEnvPlan {
  const entries = plan.entries.filter((e) => e.source !== "inferred");
  const merged: Record<string, string> = {};
  for (const entry of entries) {
    merged[entry.key] = entry.value;
  }
  return { entries, merged, hasInferred: false };
}
