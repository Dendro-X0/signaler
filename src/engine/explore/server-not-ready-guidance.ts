import { mkdir, writeFile } from "node:fs/promises";
import { join, resolve } from "node:path";
import { buildDevServerGuidanceLines } from "../../dev-server-guidance.js";
import type { RepoExploreManifest } from "./repo-explore.js";

export type ServerNotReadyReason = "no-server" | "managed-serve-failed";

export type ServerNotReadyParams = {
  readonly projectRoot: string;
  readonly baseUrl: string;
  readonly explore?: RepoExploreManifest;
  readonly reason?: ServerNotReadyReason;
};

/**
 * Friendly guidance when no loopback server is reachable (attach-first default).
 * Does not treat this as a hard failure — user starts the app and reruns.
 */
export async function formatServerNotReadyGuidance(params: ServerNotReadyParams): Promise<string> {
  const lines: string[] = [
    "",
    "Your app server is not running yet — Signaler did not run an audit.",
    "",
    "Start your development server in a separate terminal, then run Signaler again.",
    "",
  ];

  if (params.reason === "managed-serve-failed") {
    lines.push(
      "Signaler could not start a production-like server for this project (build/start may need manual setup).",
      "Starting the dev server yourself is the most reliable next step.",
      "",
    );
  }

  const devLines = await buildDevServerGuidanceLines({
    projectRoot: params.projectRoot,
    baseUrl: params.baseUrl,
  });
  lines.push(...devLines);

  if (params.explore && params.explore.portHints.length > 0) {
    lines.push("", `Detected port hint(s): ${params.explore.portHints.join(", ")}.`);
  }

  const cwd = params.projectRoot.replace(/\\/g, "/");
  lines.push(
    "",
    "When the server is up, rerun:",
    `  signaler audit --cwd "${cwd}" --base-url ${params.baseUrl}`,
    "",
    "Tip: `signaler explore` shows routes and loopback probes without running an audit.",
  );

  return lines.join("\n");
}

export type ServerNotReadyArtifact = {
  readonly schemaVersion: 1;
  readonly status: "server-not-ready";
  readonly projectRoot: string;
  readonly baseUrl: string;
  readonly reason: ServerNotReadyReason;
  readonly guidance: string;
  readonly rerunCommand: string;
  readonly portHints?: readonly number[];
  readonly serveRoot?: string;
};

export async function writeServerNotReadyArtifact(params: {
  readonly outputDir: string;
  readonly artifact: ServerNotReadyArtifact;
}): Promise<string> {
  const dir = resolve(params.outputDir);
  await mkdir(dir, { recursive: true });
  const path = join(dir, "server-not-ready.json");
  await writeFile(path, `${JSON.stringify(params.artifact, null, 2)}\n`, "utf8");
  return path;
}

export async function reportServerNotReady(params: ServerNotReadyParams & {
  readonly outputDir: string;
}): Promise<{ readonly guidance: string; readonly artifactPath: string }> {
  const guidance = await formatServerNotReadyGuidance(params);
  const cwd = params.projectRoot.replace(/\\/g, "/");
  const artifactPath = await writeServerNotReadyArtifact({
    outputDir: params.outputDir,
    artifact: {
      schemaVersion: 1,
      status: "server-not-ready",
      projectRoot: params.projectRoot,
      baseUrl: params.baseUrl,
      reason: params.reason ?? "no-server",
      guidance,
      rerunCommand: `signaler audit --cwd "${cwd}" --base-url ${params.baseUrl}`,
      portHints:
        params.explore && params.explore.portHints.length > 0
          ? params.explore.portHints
          : undefined,
      serveRoot: params.explore?.nextAppRoot,
    },
  });
  // eslint-disable-next-line no-console
  console.log(guidance);
  // eslint-disable-next-line no-console
  console.log(`Details: ${artifactPath}`);
  return { guidance, artifactPath };
}
