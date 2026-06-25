import { runBootstrapCli } from "./bootstrap-cli.js";

/**
 * Zero-config onboarding: explore project → auto-write signaler.config.json → optional audit.
 *
 * @param argv - The process arguments array.
 */
export async function runQuickstartCli(argv: readonly string[]): Promise<void> {
  const bootstrapArgv: string[] = ["node", "signaler", "bootstrap", "--audit"];
  for (let i = 2; i < argv.length; i += 1) {
    const arg = argv[i] ?? "";
    if ((arg === "--base-url" || arg === "-b") && i + 1 < argv.length) {
      bootstrapArgv.push("--base-url", argv[i + 1] ?? "");
      i += 1;
      continue;
    }
    if ((arg === "--project-root" || arg === "-p" || arg === "--cwd") && i + 1 < argv.length) {
      bootstrapArgv.push("--cwd", argv[i + 1] ?? "");
      i += 1;
      continue;
    }
    if (arg === "--yes" || arg === "-y") {
      bootstrapArgv.push("--yes");
      continue;
    }
    if (arg === "--managed-serve") {
      bootstrapArgv.push("--managed-serve");
    }
  }
  if (!bootstrapArgv.includes("--yes")) {
    bootstrapArgv.push("--yes");
  }
  await runBootstrapCli(bootstrapArgv);
}
