import { beforeEach, describe, expect, it, vi } from "vitest";

const runAuditOrchestratorMock = vi.fn(async () => {});
const runWizardCliMock = vi.fn(async () => {});
const runReportCliMock = vi.fn(async () => {});

vi.mock("../src/shell/audit-orchestrator-cli.js", () => ({
  runAuditOrchestratorCli: runAuditOrchestratorMock,
}));

vi.mock("../src/wizard-cli.js", () => ({
  runWizardCli: runWizardCliMock,
}));

vi.mock("../src/report-cli.js", () => ({
  runReportCli: runReportCliMock,
}));

beforeEach(() => {
  runAuditOrchestratorMock.mockClear();
  runWizardCliMock.mockClear();
  runReportCliMock.mockClear();
});

describe("bin v4 command routing", () => {
  it("routes audit to orchestrator without deprecation alias message", async () => {
    const logSpy = vi.spyOn(console, "log").mockImplementation(() => {});
    try {
      const { runBin } = await import("../src/bin.js");
      await runBin(["node", "signaler", "audit"]);
      const output = logSpy.mock.calls.map((call) => String(call[0] ?? "")).join("\n");
      expect(output).not.toContain("Compatibility alias: 'audit' maps to primary 'run'");
      expect(runAuditOrchestratorMock).toHaveBeenCalledTimes(1);
    } finally {
      logSpy.mockRestore();
    }
  });

  it("prints deprecation guidance for review alias", async () => {
    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
    try {
      const { runBin } = await import("../src/bin.js");
      await runBin(["node", "signaler", "review"]);
      const output = warnSpy.mock.calls.map((call) => String(call[0] ?? "")).join("\n");
      expect(output).toContain("Compatibility alias: 'review' maps to primary 'report'");
      expect(output).toContain("removal planned for v5.3.0");
      expect(runReportCliMock).toHaveBeenCalledTimes(1);
    } finally {
      warnSpy.mockRestore();
    }
  });

  it("prints deprecation guidance for init alias", async () => {
    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
    try {
      const { runBin } = await import("../src/bin.js");
      await runBin(["node", "signaler", "init"]);
      const output = warnSpy.mock.calls.map((call) => String(call[0] ?? "")).join("\n");
      expect(output).toContain("Compatibility alias: use 'discover' as the primary setup command");
      expect(output).toContain("removal planned for v5.3.0");
      expect(runWizardCliMock).toHaveBeenCalledTimes(1);
      expect(runWizardCliMock.mock.calls[0]?.[0]).toEqual(expect.arrayContaining(["--scope", "full"]));
    } finally {
      warnSpy.mockRestore();
    }
  });

  it("defaults wizard to full-scope discovery when scope is omitted", async () => {
    const { runBin } = await import("../src/bin.js");
    await runBin(["node", "signaler", "wizard"]);
    expect(runWizardCliMock).toHaveBeenCalledTimes(1);
    expect(runWizardCliMock.mock.calls[0]?.[0]).toEqual(expect.arrayContaining(["--scope", "full"]));
  });
});
