import { beforeEach, describe, expect, it, vi } from "vitest";

const runAuditOrchestratorMock = vi.fn(async () => {});
const runAuditCliMock = vi.fn(async () => {});

vi.mock("../src/shell/audit-orchestrator-cli.js", () => ({
  runAuditOrchestratorCli: runAuditOrchestratorMock,
}));

vi.mock("../src/cli.js", () => ({
  runAuditCli: runAuditCliMock,
}));

beforeEach(() => {
  runAuditOrchestratorMock.mockClear();
  runAuditCliMock.mockClear();
});

describe("shell dispatch audit", () => {
  it("routes audit to orchestrator and run to Lighthouse cli", async () => {
    const { dispatchShellCommand } = await import("../src/shell/dispatch.js");
    await dispatchShellCommand({
      command: "audit",
      argv: ["node", "signaler", "audit", "--scope", "quick"],
    });
    await dispatchShellCommand({
      command: "run",
      argv: ["node", "signaler", "run", "--config", "x.json"],
    });
    expect(runAuditOrchestratorMock).toHaveBeenCalledTimes(1);
    expect(runAuditCliMock).toHaveBeenCalledTimes(1);
  });
});
