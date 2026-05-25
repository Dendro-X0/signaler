import { describe, expect, it } from "vitest";
import { parseAuditOrchestratorArgs } from "../src/shell/audit-orchestrator-cli.js";

describe("audit-orchestrator-cli", () => {
  it("defaults to full scope with managed serve and in-process", () => {
    const prevDiscover = process.env.SIGNALER_DISCOVER_SCOPE;
    const prevServe = process.env.SIGNALER_MANAGED_SERVE;
    const prevInProcess = process.env.SIGNALER_JOB_IN_PROCESS;
    delete process.env.SIGNALER_DISCOVER_SCOPE;
    delete process.env.SIGNALER_MANAGED_SERVE;
    delete process.env.SIGNALER_JOB_IN_PROCESS;
    try {
      const args = parseAuditOrchestratorArgs(["node", "signaler", "audit"]);
      expect(args.discoverScope).toBe("full");
      expect(args.managedServe).toBe(true);
      expect(args.managedServeMode).toBe("auto");
      expect(args.inProcess).toBe(true);
      expect(args.skipDiscover).toBe(false);
    } finally {
      if (prevDiscover !== undefined) {
        process.env.SIGNALER_DISCOVER_SCOPE = prevDiscover;
      }
      if (prevServe !== undefined) {
        process.env.SIGNALER_MANAGED_SERVE = prevServe;
      }
      if (prevInProcess !== undefined) {
        process.env.SIGNALER_JOB_IN_PROCESS = prevInProcess;
      }
    }
  });

  it("defaults audit orchestrator to full discover scope", () => {
    const prevDiscover = process.env.SIGNALER_DISCOVER_SCOPE;
    delete process.env.SIGNALER_DISCOVER_SCOPE;
    try {
      const args = parseAuditOrchestratorArgs(["node", "signaler", "audit"]);
      expect(args.discoverScope).toBe("full");
    } finally {
      if (prevDiscover !== undefined) {
        process.env.SIGNALER_DISCOVER_SCOPE = prevDiscover;
      }
    }
  });

  it("parses skip-discover and scope overrides", () => {
    const args = parseAuditOrchestratorArgs([
      "node",
      "signaler",
      "audit",
      "--scope",
      "full",
      "--skip-discover",
      "--no-managed-serve",
      "--cwd",
      "/tmp/project",
    ]);
    expect(args.discoverScope).toBe("full");
    expect(args.skipDiscover).toBe(true);
    expect(args.managedServe).toBe(false);
    expect(args.cwd.replace(/\\/g, "/")).toContain("/tmp/project");
  });
});
