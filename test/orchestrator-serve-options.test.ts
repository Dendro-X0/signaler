import { describe, expect, it } from "vitest";
import { parseJobCliArgs } from "../src/job-cli.js";
import { buildAgentPresetJob } from "../src/engine/jobs/presets.js";
import { patchJobRunStepArgs } from "../src/engine/jobs/run-preset-job.js";
import { createOrchestratorServeDefaults } from "../src/shell/orchestrator-serve-options.js";
import { parseAuditOrchestratorArgs } from "../src/shell/audit-orchestrator-cli.js";
import { resolveEffectiveOrchestratorServe } from "../src/shell/resolve-orchestrator-serve.js";

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
  it("defaults to attach-first (managed serve off) with in-process steps", () => {
    withCleanServeEnv(() => {
      expect(createOrchestratorServeDefaults()).toEqual({
        inProcess: true,
        managedServe: false,
        managedServeSetByCli: false,
        managedServeMode: "production",
        managedServeModeSetByCli: false,
        managedServeSkipBuild: false,
        managedServeReuse: false,
        serveEnvOverrides: {},
        noAuditBypass: false,
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

describe("resolveEffectiveOrchestratorServe", () => {
  it("enables managed serve when config serve.mode is production", () => {
    const options = createOrchestratorServeDefaults();
    const resolved = resolveEffectiveOrchestratorServe({
      options,
      configServe: { mode: "production" },
    });
    expect(resolved.managedServe).toBe(true);
    expect(resolved.managedServeMode).toBe("production");
  });

  it("CLI --managed-serve overrides config attach mode", () => {
    const options = createOrchestratorServeDefaults();
    options.managedServe = true;
    options.managedServeSetByCli = true;
    const resolved = resolveEffectiveOrchestratorServe({
      options,
      configServe: { mode: "attach" },
    });
    expect(resolved.managedServe).toBe(true);
  });

  it("defaults to attach when no config or env", () => {
    withCleanServeEnv(() => {
      const resolved = resolveEffectiveOrchestratorServe({
        options: createOrchestratorServeDefaults(),
      });
      expect(resolved.managedServe).toBe(false);
    });
  });

  it("honors SIGNALER_MANAGED_SERVE=1 for legacy CI opt-in", () => {
    withCleanServeEnv(() => {
      process.env.SIGNALER_MANAGED_SERVE = "1";
      const resolved = resolveEffectiveOrchestratorServe({
        options: createOrchestratorServeDefaults(),
      });
      expect(resolved.managedServe).toBe(true);
    });
  });
});

describe("audit and job serve flag parity", () => {
  it("audit defaults to attach-first (managed serve off)", () => {
    withCleanServeEnv(() => {
      const args = parseAuditOrchestratorArgs(["node", "signaler", "audit"]);
      expect(args.managedServe).toBe(false);
      expect(args.managedServeMode).toBe("production");
      expect(args.inProcess).toBe(true);
    });
  });

  it("job run matches audit attach-first defaults", () => {
    withCleanServeEnv(() => {
      const args = parseJobCliArgs(["node", "signaler", "job", "run"]);
      expect(args.managedServe).toBe(false);
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
      "--managed-serve",
      "--managed-serve-mode",
      "production",
      "--no-in-process",
    ]);
    expect(args.managedServe).toBe(true);
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

describe("preset job run step serve flags", () => {
  it("adds --no-managed-serve to inner run so audit/job flags are not ignored", () => {
    const job = patchJobRunStepArgs(
      buildAgentPresetJob({ cwd: "/tmp/project", outputDir: ".signaler", labAuth: true }),
      { noManagedServe: true },
    );
    const runStep = job.steps.find((step) => step.command === "run");
    expect(runStep?.args).toContain("--no-managed-serve");
    expect(runStep?.args).toContain("--lab-auth");
    expect(runStep?.args).not.toContain("--managed-serve");
  });
});
