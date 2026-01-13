import { execFileSync } from "node:child_process";
import { copyFileSync, mkdirSync } from "node:fs";
import { resolve } from "node:path";

type BuildSidecarParams = {
  readonly repoRootDir: string;
};

const getHostTargetTriple = (): string => {
  const output: string = execFileSync("rustc", ["--print", "host-tuple"], {
    encoding: "utf8",
    stdio: ["ignore", "pipe", "inherit"],
  }).trim();
  if (output.length === 0) {
    throw new Error("Failed to determine Rust host target triple.");
  }
  return output;
};

const buildLauncher = (params: BuildSidecarParams): void => {
  execFileSync(
    "cargo",
    ["build", "--release", "--manifest-path", resolve(params.repoRootDir, "launcher", "Cargo.toml")],
    {
      encoding: "utf8",
      stdio: "inherit",
    },
  );
};

const copySidecarBinary = (params: { readonly repoRootDir: string; readonly targetTriple: string }): void => {
  const isWindows: boolean = process.platform === "win32";
  const executableExtension: string = isWindows ? ".exe" : "";
  const builtBinaryPath: string = resolve(
    params.repoRootDir,
    "launcher",
    "target",
    "release",
    `signaler${executableExtension}`,
  );
  const binariesDir: string = resolve(params.repoRootDir, "app", "src-tauri", "binaries");
  mkdirSync(binariesDir, { recursive: true });
  const targetBinaryPath: string = resolve(
    binariesDir,
    `signaler-${params.targetTriple}${executableExtension}`,
  );
  copyFileSync(builtBinaryPath, targetBinaryPath);
  process.stdout.write(`Sidecar binary copied to: ${targetBinaryPath}\n`);
};

const run = (): void => {
  const repoRootDir: string = resolve(import.meta.dirname, "..");
  const targetTriple: string = getHostTargetTriple();
  buildLauncher({ repoRootDir });
  copySidecarBinary({ repoRootDir, targetTriple });
};

run();
