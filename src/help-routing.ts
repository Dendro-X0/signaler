export type HelpRoutableCommand =
  | "install"
  | "run"
  | "review"
  | "audit"
  | "quick"
  | "report"
  | "analyze"
  | "verify"
  | "upgrade"
  | "measure"
  | "bundle"
  | "folder"
  | "health"
  | "links"
  | "headers"
  | "console"
  | "clean"
  | "uninstall"
  | "clear-screenshots"
  | "wizard"
  | "quickstart"
  | "guide"
  | "tui"
  | "shell"
  | "help"
  | "init"
  | "discover"
  | "config"
  | "export"
  | "ai"
  | "cortex"
  | "version"
  | "install-shim";

export function hasHelpFlag(args: readonly string[]): boolean {
  return args.some((arg) => arg === "--help" || arg === "-h");
}

export function resolveCommandHelpTopic(command: HelpRoutableCommand): string | undefined {
  if (command === "audit" || command === "run") {
    return "run";
  }
  if (command === "discover" || command === "init" || command === "wizard" || command === "guide") {
    return "discover";
  }
  if (command === "report" || command === "review") {
    return "report";
  }
  if (
    command === "analyze" ||
    command === "verify" ||
    command === "quickstart" ||
    command === "quick" ||
    command === "measure" ||
    command === "bundle" ||
    command === "folder" ||
    command === "health" ||
    command === "links" ||
    command === "headers" ||
    command === "console" ||
    command === "clean" ||
    command === "uninstall" ||
    command === "clear-screenshots" ||
    command === "install" ||
    command === "upgrade" ||
    command === "shell" ||
    command === "tui" ||
    command === "config" ||
    command === "export" ||
    command === "ai" ||
    command === "cortex" ||
    command === "install-shim"
  ) {
    return command;
  }
  return undefined;
}
