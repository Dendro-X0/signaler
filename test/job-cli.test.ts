import { describe, expect, it } from "vitest";
import { runJobCli } from "../src/job-cli.js";

describe("job-cli", () => {
  it("prints agent preset job via show", async () => {
    const lines: string[] = [];
    const original = console.log;
    console.log = (value?: unknown) => {
      lines.push(String(value));
    };
    try {
      await runJobCli(["node", "signaler", "job", "show", "--preset", "agent", "--json"]);
    } finally {
      console.log = original;
    }
    const payload = JSON.parse(lines.join("\n")) as {
      readonly schemaVersion: number;
      readonly preset: string;
      readonly steps: readonly { readonly command: string }[];
    };
    expect(payload.schemaVersion).toBe(1);
    expect(payload.preset).toBe("agent");
    expect(payload.steps.map((step) => step.command)).toEqual(["discover", "run", "analyze"]);
  });

  it("prints pr preset with changed-only run", async () => {
    const lines: string[] = [];
    const original = console.log;
    console.log = (value?: unknown) => {
      lines.push(String(value));
    };
    try {
      await runJobCli(["node", "signaler", "job", "show", "--preset", "pr", "--json"]);
    } finally {
      console.log = original;
    }
    const payload = JSON.parse(lines.join("\n")) as {
      readonly preset: string;
      readonly steps: readonly { readonly command: string; readonly args?: readonly string[] }[];
    };
    expect(payload.preset).toBe("pr");
    expect(payload.steps.map((step) => step.command)).toEqual(["run", "analyze"]);
    const runArgs = payload.steps[0]?.args ?? [];
    expect(runArgs).toContain("--changed-only");
    expect(runArgs).not.toContain("--incremental");
  });

  it("passes discover scope to agent preset", async () => {
    const lines: string[] = [];
    const original = console.log;
    console.log = (value?: unknown) => {
      lines.push(String(value));
    };
    try {
      await runJobCli(["node", "signaler", "job", "show", "--preset", "agent", "--scope", "quick", "--json"]);
    } finally {
      console.log = original;
    }
    const payload = JSON.parse(lines.join("\n")) as {
      readonly steps: readonly { readonly command: string; readonly args?: readonly string[] }[];
    };
    const discoverArgs = payload.steps[0]?.args ?? [];
    expect(discoverArgs).toContain("--scope");
    expect(discoverArgs).toContain("quick");
  });

  it("rejects using preset and run-profile together", async () => {
    await expect(
      runJobCli(["node", "signaler", "job", "show", "--preset", "ci", "--run-profile", "ci-strict"]),
    ).rejects.toThrow(/either --preset or --run-profile/i);
  });

  it("prints web-quality profile job via show", async () => {
    const lines: string[] = [];
    const original = console.log;
    console.log = (value?: unknown) => {
      lines.push(String(value));
    };
    try {
      await runJobCli(["node", "signaler", "job", "show", "--quality-profile", "web-quality", "--json"]);
    } finally {
      console.log = original;
    }
    const payload = JSON.parse(lines.join("\n")) as {
      readonly qualityProfile?: string;
      readonly steps: readonly { readonly command: string }[];
    };
    expect(payload.qualityProfile).toBe("web-quality");
    expect(payload.steps.map((step) => step.command)).toEqual([
      "discover",
      "run",
      "headers",
      "links",
      "health",
      "console",
      "measure",
      "accessibility",
      "bundle",
      "analyze",
    ]);
    const analyzeArgs = payload.steps.find((step) => step.command === "analyze")?.args ?? [];
    expect(analyzeArgs).toContain("--auto-benchmark-bridge");
  });

  it("prints release-full run profile with fidelity mode", async () => {
    const lines: string[] = [];
    const original = console.log;
    console.log = (value?: unknown) => {
      lines.push(String(value));
    };
    try {
      await runJobCli(["node", "signaler", "job", "show", "--run-profile", "release-full", "--json"]);
    } finally {
      console.log = original;
    }
    const payload = JSON.parse(lines.join("\n")) as {
      readonly runProfile: string;
      readonly steps: readonly { readonly command: string; readonly args?: readonly string[] }[];
    };
    expect(payload.runProfile).toBe("release-full");
    const runArgs = payload.steps.find((step) => step.command === "run")?.args ?? [];
    expect(runArgs).toContain("fidelity");
  });

  it("includes parallel on agent preset run step", async () => {
    const lines: string[] = [];
    const original = console.log;
    console.log = (value?: unknown) => {
      lines.push(String(value));
    };
    try {
      await runJobCli(["node", "signaler", "job", "show", "--preset", "agent", "--parallel", "4", "--json"]);
    } finally {
      console.log = original;
    }
    const payload = JSON.parse(lines.join("\n")) as {
      readonly steps: readonly { readonly command: string; readonly args?: readonly string[] }[];
    };
    const runArgs = payload.steps.find((step) => step.command === "run")?.args ?? [];
    expect(runArgs).toContain("--parallel");
    expect(runArgs).toContain("4");
  });
});
