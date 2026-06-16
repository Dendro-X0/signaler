export function formatManagedServePortConflict(params: {
  readonly port: number;
  readonly baseUrl: string;
}): string {
  return [
    `Managed serve: port ${params.port} is already in use but ${params.baseUrl} is not healthy.`,
    "A stale or hung server process is likely blocking the port.",
    "",
    "Next checks:",
    `  - Stop the process on port ${params.port} (Windows: netstat -ano | findstr :${params.port}, then taskkill /F /PID <pid>).`,
    `  - Start manually: DEMO_AUTH_BYPASS=true pnpm run start (from project root), then rerun with --no-managed-serve.`,
    "  - Or retry with --managed-serve-reuse if the existing server is intentionally running.",
  ].join("\n");
}

export function formatManagedServeStartTimeout(params: {
  readonly mode: "dev" | "production";
  readonly baseUrl: string;
  readonly timeoutMs: number;
  readonly requestedProjectRoot: string;
  readonly resolvedProjectRoot: string;
  readonly script: string;
  readonly cause?: unknown;
}): string {
  const lines: string[] = [
    `Managed serve (${params.mode}) startup timed out after ${params.timeoutMs}ms.`,
    `Target URL: ${params.baseUrl}/`,
    `Requested project root: ${params.requestedProjectRoot}`,
    `Resolved script root: ${params.resolvedProjectRoot}`,
    `Script: ${params.script}`,
    "",
    "Likely causes:",
    "  - Dev/build process did not start cleanly (script error or missing dependency).",
    "  - Wrong project root for monorepo layout (for example app is under apps/web).",
    "  - App started on a different port than expected.",
    "  - Initial compile/build exceeded timeout on this machine.",
    "",
    "Next checks:",
    `  - Run manually in resolved root: cd "${params.resolvedProjectRoot}" && ${params.script}`,
    "  - Confirm URL is reachable in a browser/curl.",
    "  - Start the app manually, then run Signaler with --no-managed-serve.",
    "  - If a server is already running but unhealthy, retry with --managed-serve-reuse.",
  ];
  if (params.resolvedProjectRoot !== params.requestedProjectRoot) {
    lines.push(
      "",
      "Monorepo hint: Signaler resolved a nested app root that differs from --cwd.",
      "If this is incorrect, rerun with --cwd pointed at the actual web app directory.",
    );
  }
  if (params.cause instanceof Error && params.cause.message.trim().length > 0) {
    lines.push("", `Cause: ${params.cause.message}`);
  }
  return lines.join("\n");
}
