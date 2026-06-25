import type { ParsedShellArgs, ShellCommandId } from "./command-id.js";

export function parseShellArgs(argv: readonly string[]): ParsedShellArgs {
  const rawCommand: string | undefined = argv[2];
  if (rawCommand === undefined) {
    return { command: "shell", argv };
  }
  if (rawCommand === "help" || rawCommand === "--help" || rawCommand === "-h") {
    return { command: "help", argv };
  }
  if (rawCommand === "version" || rawCommand === "--version" || rawCommand === "-v") {
    return { command: "version", argv };
  }
  if (rawCommand === "shell") {
    const commandArgv: readonly string[] = ["node", "signaler", ...argv.slice(3)];
    return { command: "shell", argv: commandArgv };
  }
  if (
    rawCommand === "run" ||
    rawCommand === "install" ||
    rawCommand === "review" ||
    rawCommand === "audit" ||
    rawCommand === "quick" ||
    rawCommand === "report" ||
    rawCommand === "analyze" ||
    rawCommand === "verify" ||
    rawCommand === "query" ||
    rawCommand === "explain" ||
    rawCommand === "job" ||
    rawCommand === "upgrade" ||
    rawCommand === "measure" ||
    rawCommand === "bundle" ||
    rawCommand === "folder" ||
    rawCommand === "health" ||
    rawCommand === "links" ||
    rawCommand === "headers" ||
    rawCommand === "console" ||
    rawCommand === "accessibility" ||
    rawCommand === "clean" ||
    rawCommand === "uninstall" ||
    rawCommand === "clear-screenshots" ||
    rawCommand === "wizard" ||
    rawCommand === "quickstart" ||
    rawCommand === "guide" ||
    rawCommand === "tui" ||
    rawCommand === "init" ||
    rawCommand === "discover" ||
    rawCommand === "explore" ||
    rawCommand === "bootstrap" ||
    rawCommand === "config" ||
    rawCommand === "export" ||
    rawCommand === "ai" ||
    rawCommand === "cortex" ||
    rawCommand === "auth" ||
    rawCommand === "install-shim"
  ) {
    const commandArgv: readonly string[] = ["node", "signaler", ...argv.slice(3)];
    return { command: rawCommand as ShellCommandId, argv: commandArgv };
  }
  return { command: "help", argv };
}
