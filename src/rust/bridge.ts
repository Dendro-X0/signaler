import { access } from "node:fs/promises";
import { spawn } from "node:child_process";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

export type RustRunResult = {
  readonly ok: boolean;
  readonly elapsedMs: number;
  readonly stdout: string;
  readonly stderr: string;
  readonly errorMessage?: string;
  readonly manifestPath?: string;
};

function commandForCargo(): string {
  return process.platform === "win32" ? "cargo.exe" : "cargo";
}

function rustBinaryName(): string {
  return process.platform === "win32" ? "signaler_hotpath.exe" : "signaler_hotpath";
}

async function pathExists(pathValue: string): Promise<boolean> {
  try {
    await access(pathValue);
    return true;
  } catch {
    return false;
  }
}

function candidateManifestPaths(): readonly string[] {
  const moduleDir: string = dirname(fileURLToPath(import.meta.url));
  return [
    resolve(moduleDir, "..", "..", "rust", "Cargo.toml"),
    resolve(process.cwd(), "rust", "Cargo.toml"),
  ];
}

function candidateBinaryPaths(): readonly string[] {
  const moduleDir: string = dirname(fileURLToPath(import.meta.url));
  const binaryName: string = rustBinaryName();
  const envPath: string | undefined = process.env.SIGNALER_RUST_SIDECAR_BIN;
  const paths: string[] = [];
  if (typeof envPath === "string" && envPath.trim().length > 0) {
    paths.push(resolve(envPath));
  }
  paths.push(resolve(moduleDir, "..", "..", "rust", "target", "release", binaryName));
  paths.push(resolve(moduleDir, "..", "..", "target", "release", binaryName));
  paths.push(resolve(process.cwd(), "rust", "target", "release", binaryName));
  paths.push(resolve(process.cwd(), "target", "release", binaryName));
  return paths;
}

export async function resolveRustManifestPath(): Promise<string | undefined> {
  for (const candidate of candidateManifestPaths()) {
    if (await pathExists(candidate)) {
      return candidate;
    }
  }
  return undefined;
}

async function resolveRustBinaryPath(): Promise<string | undefined> {
  for (const candidate of candidateBinaryPaths()) {
    if (await pathExists(candidate)) {
      return candidate;
    }
  }
  return undefined;
}

export function isRustFeatureEnabled(
  flagName:
    | "SIGNALER_RUST_CORE"
    | "SIGNALER_RUST_DISCOVERY"
    | "SIGNALER_RUST_PROCESSOR"
    | "SIGNALER_RUST_NETWORK"
    | "SIGNALER_RUST_HEALTH"
    | "SIGNALER_RUST_HEADERS"
    | "SIGNALER_RUST_LINKS"
    | "SIGNALER_RUST_CONSOLE",
): boolean {
  return process.env[flagName] === "1";
}

export async function runRustSidecar(params: {
  readonly args: readonly string[];
  readonly timeoutMs?: number;
}): Promise<RustRunResult> {
  const startedAtMs: number = Date.now();
  const binaryPath: string | undefined = await resolveRustBinaryPath();
  const manifestPath: string | undefined = await resolveRustManifestPath();

  if (!binaryPath && !manifestPath) {
    return {
      ok: false,
      elapsedMs: Date.now() - startedAtMs,
      stdout: "",
      stderr: "",
      errorMessage: "Rust sidecar binary and manifest were not found.",
    };
  }

  const command: string = binaryPath ?? commandForCargo();
  const argv: readonly string[] = binaryPath
    ? [...params.args]
    : [
      "run",
      "--manifest-path",
      manifestPath as string,
      "-p",
      "signaler_hotpath",
      "--",
      ...params.args,
    ];

  const timeoutMs: number = params.timeoutMs ?? 45_000;
  return await new Promise<RustRunResult>((resolveResult) => {
    const child = spawn(command, argv, { shell: false, stdio: ["ignore", "pipe", "pipe"] });
    let stdout = "";
    let stderr = "";
    const timeoutHandle = setTimeout(() => {
      try {
        child.kill();
      } catch {
        // Ignore timeout kill errors.
      }
      resolveResult({
        ok: false,
        elapsedMs: Date.now() - startedAtMs,
        stdout: stdout.trim(),
        stderr: stderr.trim(),
        errorMessage: `Rust sidecar timed out after ${timeoutMs}ms.`,
        manifestPath,
      });
    }, timeoutMs);

    child.stdout.on("data", (chunk: Buffer | string) => {
      stdout += chunk.toString();
    });
    child.stderr.on("data", (chunk: Buffer | string) => {
      stderr += chunk.toString();
    });
    child.on("error", (error) => {
      clearTimeout(timeoutHandle);
      resolveResult({
        ok: false,
        elapsedMs: Date.now() - startedAtMs,
        stdout: stdout.trim(),
        stderr: stderr.trim(),
        errorMessage: error.message,
        manifestPath,
      });
    });
    child.on("close", (code) => {
      clearTimeout(timeoutHandle);
      resolveResult({
        ok: code === 0,
        elapsedMs: Date.now() - startedAtMs,
        stdout: stdout.trim(),
        stderr: stderr.trim(),
        errorMessage: code === 0 ? undefined : (stderr.trim() || `Rust sidecar exited with code ${code ?? 1}.`),
        manifestPath,
      });
    });
  });
}
