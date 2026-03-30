import { beforeEach, describe, expect, it, vi } from "vitest";

const runAuditCliMock = vi.fn(async () => {});
const runWizardCliMock = vi.fn(async () => {});
const runReportCliMock = vi.fn(async () => {});

vi.mock("../src/cli.js", () => ({
  runAuditCli: runAuditCliMock,
}));

vi.mock("../src/wizard-cli.js", () => ({
  runWizardCli: runWizardCliMock,
}));

vi.mock("../src/report-cli.js", () => ({
  runReportCli: runReportCliMock,
}));

beforeEach(() => {
  runAuditCliMock.mockClear();
  runWizardCliMock.mockClear();
  runReportCliMock.mockClear();
});

describe("bin alias deprecation messaging", () => {
  it("prints deprecation guidance for audit alias", async () => {
    const logSpy = vi.spyOn(console, "log").mockImplementation(() => {});
    const { runBin } = await import("../src/bin.js");
    await runBin(["node", "signaler", "audit"]);
    const output = logSpy.mock.calls.map((call) => String(call[0] ?? "")).join("\n");
    expect(output).toContain("Compatibility alias: 'audit' maps to primary 'run'");
    expect(output).toContain("planned removal in v4.0");
    expect(runAuditCliMock).toHaveBeenCalledTimes(1);
    logSpy.mockRestore();
  });

  it("prints deprecation guidance for review alias", async () => {
    const logSpy = vi.spyOn(console, "log").mockImplementation(() => {});
    const { runBin } = await import("../src/bin.js");
    await runBin(["node", "signaler", "review"]);
    const output = logSpy.mock.calls.map((call) => String(call[0] ?? "")).join("\n");
    expect(output).toContain("Compatibility alias: 'review' maps to primary 'report'");
    expect(output).toContain("planned removal in v4.0");
    expect(runReportCliMock).toHaveBeenCalledTimes(1);
    logSpy.mockRestore();
  });

  it("prints deprecation guidance for init alias", async () => {
    const logSpy = vi.spyOn(console, "log").mockImplementation(() => {});
    const { runBin } = await import("../src/bin.js");
    await runBin(["node", "signaler", "init"]);
    const output = logSpy.mock.calls.map((call) => String(call[0] ?? "")).join("\n");
    expect(output).toContain("Compatibility alias: use 'discover' as the primary setup command");
    expect(output).toContain("planned removal in v4.0");
    expect(runWizardCliMock).toHaveBeenCalledTimes(1);
    expect(runWizardCliMock.mock.calls[0]?.[0]).toEqual(expect.arrayContaining(["--scope", "full"]));
    logSpy.mockRestore();
  });

  it("defaults wizard to full-scope discovery when scope is omitted", async () => {
    const { runBin } = await import("../src/bin.js");
    await runBin(["node", "signaler", "wizard"]);
    expect(runWizardCliMock).toHaveBeenCalledTimes(1);
    expect(runWizardCliMock.mock.calls[0]?.[0]).toEqual(expect.arrayContaining(["--scope", "full"]));
  });
});
