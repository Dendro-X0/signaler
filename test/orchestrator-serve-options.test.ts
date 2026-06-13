import { describe, expect, it } from "vitest";
import { parseJobCliArgs } from "../src/job-cli.js";
import { createOrchestratorServeDefaults } from "../src/shell/orchestrator-serve-options.js";
import { parseAuditOrchestratorArgs } from "../src/shell/audit-orchestrator-cli.js";

function withCleanServeEnv(run: () => void): void {
  const prevDiscover = process.env.SIGNALER_DISCOVER_SCOPE;
  const prevServe = process.env.SIGNALER_MANAGED_SERVE;
  const prevServeMode = process.env.SIGNALER_MANAGED_SERVE_MODE;
  const prevInProcess = process.env.SIGNALER_JOB_IN_PROCESS;
  const prevReuse = process.env.SIGNALER_MANAGED_SERVE_REUSE;
  delete process.env.SIGNALER_DISCOVER_SCOPE;
  delete process.env.SIGNALER_MANAGED_SERVE;
  delete process.env.SIGNALER_MANAGED_SERVE_MODE;
  delete process.env.SIGNALER_JOB_IN_PROCESS;
  delete process.env.SIGNALER_MANAGED_SERVE_REUSE;
  try {
    run();
  } finally {
    if (prevDiscover !== undefined) {
      process.env.SIGNALER_DISCOVER_SCOPE = prevDiscover;
    } else {
      delete process.env.SIGNALER_DISCOVER_SCOPE;
    }
    if (prevServe !== undefined) {
      process.env.SIGNALER_MANAGED_SERVE = prevServe;
    } else {
      delete process.env.SIGNALER_MANAGED_SERVE;
    }
    if (prevServeMode !== undefined) {
      process.env.SIGNALER_MANAGED_SERVE_MODE = prevServeMode;
    } else {
      delete process.env.SIGNALER_MANAGED_SERVE_MODE;
    }
    if (prevInProcess !== undefined) {
      process.env.SIGNALER_JOB_IN_PROCESS = prevInProcess;
    } else {
      delete process.env.SIGNALER_JOB_IN_PROCESS;
    }
    if (prevReuse !== undefined) {
      process.env.SIGNALER_MANAGED_SERVE_REUSE = prevReuse;
    } else {
      delete process.env.SIGNALER_MANAGED_SERVE_REUSE;
    }
  }
}

describe("orchestrator serve defaults", () => {
  it("enables managed serve, in-process, and production mode by default", () => {
    withCleanServeEnv(() => {
      expect(createOrchestratorServeDefaults()).toEqual({
        inProcess: true,
        managedServe: true,
        managedServeMode: "production",
        managedServeSkipBuild: false,
        managedServeReuse: false,
      });
    });
  });

  it("honors SIGNALER_MANAGED_SERVE=0 and SIGNALER_JOB_IN_PROCESS=0", () => {
    withCleanServeEnv(() => {
      process.env.SIGNALER_MANAGED_SERVE = "0";
      process.env.SIGNALER_JOB_IN_PROCESS = "0";
      const defaults = createOrchestratorServeDefaults();
      expect(defaults.managedServe).toBe(false);
      expect(defaults.inProcess).toBe(false);
    });
  });
});

describe("audit and job serve flag parity", () => {
  it("audit defaults to managed serve, production mode, and in-process", () => {
    withCleanServeEnv(() => {
      const args = parseAuditOrchestratorArgs(["node", "signaler", "audit"]);
      expect(args.managedServe).toBe(true);
      expect(args.managedServeMode).toBe("production");
      expect(args.inProcess).toBe(true);
    });
  });

  it("job run matches audit defaults", () => {
    withCleanServeEnv(() => {
      const args = parseJobCliArgs(["node", "signaler", "job", "run"]);
      expect(args.managedServe).toBe(true);
      expect(args.managedServeMode).toBe("production");
      expect(args.inProcess).toBe(true);
    });
  });

  it("job run parses managed-serve-mode and opt-out flags", () => {
    const args = parseJobCliArgs([
      "node",
      "signaler",
      "job",
      "run",
      "--no-managed-serve",
      "--managed-serve-mode",
      "production",
      "--no-in-process",
    ]);
    expect(args.managedServe).toBe(false);
    expect(args.managedServeMode).toBe("production");
    expect(args.inProcess).toBe(false);
  });

  it("audit parses skip-discover and scope overrides", () => {
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
