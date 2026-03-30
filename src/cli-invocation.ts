import type { ApexDevice } from "./core/types.js";

export function shellQuote(arg: string): string {
  if (arg.length === 0) {
    return '""';
  }
  if (!/[\s"]/u.test(arg)) {
    return arg;
  }
  return `"${arg.replace(/"/g, '\\"')}"`;
}

export function resolveSuggestedCommandPrefix(argv: readonly string[] = process.argv): string {
  const scriptPath: string | undefined = argv[1];
  if (typeof scriptPath !== "string" || scriptPath.length === 0) {
    return "signaler";
  }

  const normalized: string = scriptPath.replace(/\\/g, "/").toLowerCase();
  const isDistBin: boolean = normalized.endsWith("/dist/bin.js");
  if (!isDistBin) {
    return "signaler";
  }

  const isInstalledPackagePath: boolean =
    normalized.includes("/node_modules/") ||
    normalized.includes("/@signaler/cli/") ||
    normalized.includes("/@jsr/");

  if (isInstalledPackagePath) {
    return "signaler";
  }

  return `node ${shellQuote(scriptPath)}`;
}

export function buildRunSuggestionCommand(params: {
  readonly configArg: string;
  readonly targetPath: string;
  readonly device: ApexDevice;
  readonly argv?: readonly string[];
}): string {
  const prefix: string = resolveSuggestedCommandPrefix(params.argv);
  const configArg: string = shellQuote(params.configArg);
  return `${prefix} run --config ${configArg} --${params.device}-only --open # focus on ${params.targetPath}`;
}
