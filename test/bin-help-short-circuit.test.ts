import { beforeEach, describe, expect, it, vi } from "vitest";

const runAuditCliMock = vi.fn(async () => {});
const runWizardCliMock = vi.fn(async () => {});

vi.mock("../src/cli.js", () => ({
  runAuditCli: runAuditCliMock,
}));

vi.mock("../src/wizard-cli.js", () => ({
  runWizardCli: runWizardCliMock,
}));

beforeEach(() => {
  runAuditCliMock.mockClear();
  runWizardCliMock.mockClear();
});

describe("bin help short-circuit", () => {
  it("does not execute discover handler for discover --help", async () => {
    const { runBin } = await import("../src/bin.js");
    await runBin(["node", "signaler", "discover", "--help"]);
    expect(runWizardCliMock).not.toHaveBeenCalled();
  });

  it("does not execute run handler for run --help", async () => {
    const { runBin } = await import("../src/bin.js");
    await runBin(["node", "signaler", "run", "--help"]);
    expect(runAuditCliMock).not.toHaveBeenCalled();
  });

  it("prints agent help topic without executing discover/run handlers", async () => {
    const logSpy = vi.spyOn(console, "log").mockImplementation(() => {});
    const { runBin } = await import("../src/bin.js");
    await runBin(["node", "signaler", "help", "agent"]);
    const rendered = logSpy.mock.calls.map((call) => String(call[0] ?? "")).join("\n");
    expect(rendered).toContain("Agent guide:");
    expect(rendered).toContain("Canonical workflow");
    expect(rendered).toContain(".signaler/analyze.json");
    expect(runWizardCliMock).not.toHaveBeenCalled();
    expect(runAuditCliMock).not.toHaveBeenCalled();
    logSpy.mockRestore();
  });

  it("prints machine-readable agent help JSON without executing discover/run handlers", async () => {
    const logSpy = vi.spyOn(console, "log").mockImplementation(() => {});
    const { runBin } = await import("../src/bin.js");
    await runBin(["node", "signaler", "help", "agent", "--json"]);
    const payloadRaw = logSpy.mock.calls.map((call) => String(call[0] ?? "")).join("\n");
    const payload = JSON.parse(payloadRaw) as {
      readonly schemaVersion?: number;
      readonly goal?: string;
      readonly workflows?: {
        readonly installedCli?: readonly string[];
        readonly localDist?: readonly string[];
      };
      readonly artifactOrder?: readonly string[];
    };
    expect(payload.schemaVersion).toBe(1);
    expect(payload.goal).toContain("deterministic");
    expect(payload.workflows?.installedCli?.[0]).toContain("signaler discover");
    expect(payload.workflows?.localDist?.[0]).toContain("node ./dist/bin.js discover");
    expect(payload.artifactOrder?.[0]).toBe(".signaler/analyze.json");
    expect(runWizardCliMock).not.toHaveBeenCalled();
    expect(runAuditCliMock).not.toHaveBeenCalled();
    logSpy.mockRestore();
  });
});
