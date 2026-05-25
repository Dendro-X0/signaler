import { spawn, spawnSync, type ChildProcess } from "node:child_process";
import type { PackageManagerId } from "./resolve-serve-plan.js";

let registeredShutdown = false;
const activeChildren = new Set<ChildProcess>();

export function registerManagedServeShutdown(): void {
  if (registeredShutdown) {
    return;
  }
  registeredShutdown = true;
  const shutdown = (): void => {
    for (const child of activeChildren) {
      void stopManagedServeChild(child);
    }
  };
  process.on("SIGINT", shutdown);
  process.on("SIGTERM", shutdown);
  process.on("exit", shutdown);
}

export function packageManagerCommand(packageManager: PackageManagerId): string {
  if (packageManager === "pnpm") {
    return process.platform === "win32" ? "pnpm.cmd" : "pnpm";
  }
  if (packageManager === "yarn") {
    return process.platform === "win32" ? "yarn.cmd" : "yarn";
  }
  return process.platform === "win32" ? "npm.cmd" : "npm";
}

export function spawnPackageScriptProcess(params: {
  readonly cwd: string;
  readonly packageManager: PackageManagerId;
  readonly script: string;
  readonly port: number;
}): ChildProcess {
  const command = packageManagerCommand(params.packageManager);
  const child = spawn(command, ["run", params.script], {
    cwd: params.cwd,
    stdio: "ignore",
    env: {
      ...process.env,
      PORT: String(params.port),
      HOSTNAME: "127.0.0.1",
      HOST: "127.0.0.1",
    },
    shell: process.platform === "win32",
    detached: process.platform !== "win32",
  });
  activeChildren.add(child);
  child.once("exit", () => activeChildren.delete(child));
  return child;
}

export async function stopManagedServeChild(child: ChildProcess): Promise<void> {
  activeChildren.delete(child);
  if (child.killed || child.exitCode !== null) {
    return;
  }
  if (process.platform === "win32" && child.pid) {
    spawnSync("taskkill", ["/pid", String(child.pid), "/T", "/F"], { stdio: "ignore", shell: true });
    return;
  }
  if (child.pid && process.platform !== "win32") {
    try {
      process.kill(-child.pid, "SIGTERM");
      return;
    } catch {
      // fall through
    }
  }
  child.kill("SIGTERM");
}
