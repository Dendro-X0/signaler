import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { spawn } from "node:child_process";
import type { BenchmarkProfile, RustProbeResult } from "./types.js";

type RustProbeParams = {
  readonly profile: BenchmarkProfile;
  readonly profilePath: string;
  readonly outputDir: string;
  readonly rootDir: string;
};

type RustProbeOutput = {
  readonly elapsedMs?: number;
  readonly elapsed_ms?: number;
};

function commandForBinary(binary: "cargo"): string {
  if (process.platform === "win32") {
    return `${binary}.exe`;
  }
  return binary;
}

async function runProcess(command: string, args: readonly string[], cwd: string): Promise<{ readonly code: number; readonly stderr: string }> {
  return await new Promise((resolveRun) => {
    const child = spawn(command, args, {
      cwd,
      shell: false,
      stdio: ["ignore", "ignore", "pipe"],
    });
    let stderr = "";
    child.stderr.on("data", (chunk: Buffer | string) => {
      stderr += chunk.toString();
    });
    child.on("error", (error) => {
      resolveRun({ code: 1, stderr: error.message });
    });
    child.on("close", (code) => {
      resolveRun({ code: code ?? 1, stderr: stderr.trim() });
    });
  });
}

export async function runRustDiscoveryProbe(params: RustProbeParams): Promise<RustProbeResult> {
  if (process.env.SIGNALER_RUST_DISCOVERY !== "1") {
    return {
      enabled: false,
      status: "skipped",
      message: "Set SIGNALER_RUST_DISCOVERY=1 to enable Rust discovery probe.",
    };
  }

  const outputPath = resolve(
    params.outputDir,
    `${params.profile.id.replace(/[^a-zA-Z0-9_-]/g, "-")}.rust-discovery.json`,
  );
  const manifestPath = resolve(params.rootDir, "rust", "Cargo.toml");
  const command = commandForBinary("cargo");
  const args = [
    "run",
    "--manifest-path",
    manifestPath,
    "-p",
    "signaler_hotpath",
    "--",
    "discover-scan",
    "--profile",
    params.profilePath,
    "--out",
    outputPath,
  ];

  const started = Date.now();
  const result = await runProcess(command, args, params.rootDir);
  if (result.code !== 0) {
    return {
      enabled: true,
      status: "error",
      message: result.stderr || "Rust probe failed to execute.",
      outputPath,
    };
  }

  try {
    const raw = await readFile(outputPath, "utf8");
    const parsed = JSON.parse(raw) as RustProbeOutput;
    return {
      enabled: true,
      status: "ok",
      elapsedMs:
        typeof parsed.elapsedMs === "number"
          ? parsed.elapsedMs
          : typeof parsed.elapsed_ms === "number"
            ? parsed.elapsed_ms
            : Date.now() - started,
      outputPath,
    };
  } catch (error) {
    return {
      enabled: true,
      status: "error",
      outputPath,
      message: `Rust probe produced invalid JSON: ${String(error)}`,
    };
  }
}
