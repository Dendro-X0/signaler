import { runAuditCli } from "../cli.js";
import { runUpgradeCli } from "../upgrade-cli.js";
import { runWizardCli } from "../wizard-cli.js";
import { runQuickstartCli } from "../quickstart-cli.js";
import { runAiCli } from "../ai-cli.js";
import { runShellCli } from "../shell-cli.js";
import { runMeasureCli } from "../measure-cli.js";
import { runAccessibilityCli } from "../accessibility-cli.js";
import { runBundleCli } from "../bundle-cli.js";
import { runHealthCli } from "../health-cli.js";
import { runLinksCli } from "../links-cli.js";
import { runHeadersCli } from "../headers-cli.js";
import { runConsoleCli } from "../console-cli.js";
import { runCleanCli } from "../clean-cli.js";
import { runUninstallCli } from "../uninstall-cli.js";
import { runClearScreenshotsCli } from "../clear-screenshots-cli.js";
import { runQuickCli } from "../quick-cli.js";
import { runReportCli } from "../report-cli.js";
import { runAnalyzeCli } from "../analyze-cli.js";
import { runVerifyCli } from "../verify-cli.js";
import { runQueryCli } from "../query-cli.js";
import { runExplainCli } from "../explain-cli.js";
import { runJobCli } from "../job-cli.js";
import { runInstallShimCli } from "../install-shim-cli.js";
import { runFolderCli } from "../folder-cli.js";
import { runCortexCli } from "../cortex-cli.js";
import { runAuthCli } from "../auth-cli.js";
import { ConfigCli, parseConfigArgs } from "../cli/config-cli.js";
import { ExportCli, parseExportArgs } from "../cli/export-cli.js";
import type { ParsedShellArgs } from "./command-id.js";
import { runAuditOrchestratorCli } from "./audit-orchestrator-cli.js";
import { runExploreCli } from "../explore-cli.js";
import { runBootstrapCli } from "../bootstrap-cli.js";

export async function dispatchShellCommand(parsed: ParsedShellArgs): Promise<void> {
  if (parsed.command === "bootstrap") {
    await runBootstrapCli(parsed.argv);
    return;
  }
  if (parsed.command === "explore") {
    await runExploreCli(parsed.argv);
    return;
  }
  if (parsed.command === "audit") {
    await runAuditOrchestratorCli(parsed.argv);
    return;
  }
  if (parsed.command === "run") {
    await runAuditCli(parsed.argv);
    return;
  }
  if (parsed.command === "install") {
    await runUpgradeCli(parsed.argv);
    return;
  }
  if (parsed.command === "quick") {
    await runQuickCli(parsed.argv);
    return;
  }
  if (parsed.command === "report") {
    await runReportCli(parsed.argv);
    return;
  }
  if (parsed.command === "analyze") {
    await runAnalyzeCli(parsed.argv);
    return;
  }
  if (parsed.command === "verify") {
    await runVerifyCli(parsed.argv);
    return;
  }
  if (parsed.command === "query") {
    await runQueryCli(parsed.argv);
    return;
  }
  if (parsed.command === "explain") {
    await runExplainCli(parsed.argv);
    return;
  }
  if (parsed.command === "job") {
    await runJobCli(parsed.argv);
    return;
  }
  if (parsed.command === "review") {
    console.log("Compatibility alias: 'review' maps to primary 'report' (planned removal in v4.0).");
    await runReportCli(parsed.argv);
    return;
  }
  if (parsed.command === "upgrade") {
    await runUpgradeCli(parsed.argv);
    return;
  }
  if (parsed.command === "measure") {
    await runMeasureCli(parsed.argv);
    return;
  }
  if (parsed.command === "bundle") {
    await runBundleCli(parsed.argv);
    return;
  }
  if (parsed.command === "folder") {
    await runFolderCli(parsed.argv);
    return;
  }
  if (parsed.command === "health") {
    await runHealthCli(parsed.argv);
    return;
  }
  if (parsed.command === "links") {
    await runLinksCli(parsed.argv);
    return;
  }
  if (parsed.command === "headers") {
    await runHeadersCli(parsed.argv);
    return;
  }
  if (parsed.command === "console") {
    await runConsoleCli(parsed.argv);
    return;
  }
  if (parsed.command === "accessibility") {
    await runAccessibilityCli(parsed.argv);
    return;
  }
  if (parsed.command === "clean") {
    await runCleanCli(parsed.argv);
    return;
  }
  if (parsed.command === "uninstall") {
    await runUninstallCli(parsed.argv);
    return;
  }
  if (parsed.command === "clear-screenshots") {
    await runClearScreenshotsCli(parsed.argv);
    return;
  }
  if (parsed.command === "init" || parsed.command === "wizard" || parsed.command === "guide" || parsed.command === "discover") {
    if (parsed.command === "init" || parsed.command === "wizard" || parsed.command === "guide") {
      console.log("Compatibility alias: use 'discover' as the primary setup command (init planned removal in v4.0).");
    }
    const hasScope: boolean = parsed.argv.some((arg) => arg === "--scope" || arg.startsWith("--scope="));
    const discoverArgv: readonly string[] =
      !hasScope
        ? [...parsed.argv, "--scope", "full"]
        : parsed.argv;
    await runWizardCli(discoverArgv);
    return;
  }
  if (parsed.command === "config") {
    const configOptions = parseConfigArgs(parsed.argv.slice(2));
    await ConfigCli.handle(configOptions);
    return;
  }
  if (parsed.command === "export") {
    const exportOptions = parseExportArgs(parsed.argv.slice(2));
    await ExportCli.handle(exportOptions);
    return;
  }
  if (parsed.command === "ai") {
    await runAiCli(parsed.argv);
    return;
  }
  if (parsed.command === "cortex") {
    await runCortexCli(parsed.argv);
    return;
  }
  if (parsed.command === "auth") {
    await runAuthCli(parsed.argv);
    return;
  }
  if (parsed.command === "install-shim") {
    await runInstallShimCli(parsed.argv);
    return;
  }
}
