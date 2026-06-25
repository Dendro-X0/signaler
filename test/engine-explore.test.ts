import { describe, expect, it } from "vitest";
import { mkdtemp, writeFile, mkdir } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { resolveConfiguredPortHints } from "../src/engine/explore/local-server-discovery.js";
import { inferAuditServeEnv } from "../src/engine/explore/infer-audit-serve-env.js";

describe("local-server-discovery", () => {
  it("reads PORT from .env.local and package scripts", async () => {
    const root = await mkdtemp(join(tmpdir(), "signaler-port-hints-"));
    await writeFile(join(root, ".env.local"), "PORT=3456\n");
    await writeFile(
      join(root, "package.json"),
      JSON.stringify({
        scripts: { dev: "next dev --port 4001" },
      }),
    );
    const hints = await resolveConfiguredPortHints(root);
    expect(hints).toContain(3456);
    expect(hints).toContain(4001);
    expect(hints).toContain(3000);
  });
});

describe("infer-audit-serve-env", () => {
  it("infers bypass env when better-auth is present", async () => {
    const root = await mkdtemp(join(tmpdir(), "signaler-auth-infer-"));
    await writeFile(
      join(root, "package.json"),
      JSON.stringify({ dependencies: { "better-auth": "^1.0.0" } }),
    );
    const env = await inferAuditServeEnv(root);
    expect(env).toMatchObject({ DEMO_AUTH_BYPASS: "true" });
  });

  it("infers bypass env when ENV_SETUP documents BETTER_AUTH_SECRET", async () => {
    const root = await mkdtemp(join(tmpdir(), "signaler-auth-infer-"));
    await writeFile(join(root, "package.json"), JSON.stringify({ name: "demo" }));
    await mkdir(join(root, "docs"), { recursive: true });
    await writeFile(join(root, "docs", "ENV_SETUP.md"), "Set BETTER_AUTH_SECRET in .env.local");
    const env = await inferAuditServeEnv(root);
    expect(env?.SIGNALER_AUDIT_MODE).toBe("true");
  });

  it("returns undefined when no auth signals", async () => {
    const root = await mkdtemp(join(tmpdir(), "signaler-auth-infer-"));
    await writeFile(join(root, "package.json"), JSON.stringify({ name: "plain-app" }));
    const env = await inferAuditServeEnv(root);
    expect(env).toBeUndefined();
  });
});

describe("serve-env-policy", () => {
  it("builds plan with inferred entries and disclosure text", async () => {
    const { buildServeEnvPlan, formatServeEnvDisclosure, stripInferredEntries } = await import(
      "../src/engine/explore/serve-env-policy.js"
    );
    const plan = buildServeEnvPlan({
      inferred: { DEMO_AUTH_BYPASS: "true" },
      fromConfig: { SIGNALER_AUDIT_MODE: "true" },
    });
    expect(plan.hasInferred).toBe(true);
    expect(plan.merged.DEMO_AUTH_BYPASS).toBe("true");
    const disclosure = formatServeEnvDisclosure(plan);
    expect(disclosure).toContain("offline, local only");
    expect(disclosure).toContain("DEMO_AUTH_BYPASS=true");
    const stripped = stripInferredEntries(plan);
    expect(stripped.hasInferred).toBe(false);
    expect(stripped.merged.DEMO_AUTH_BYPASS).toBeUndefined();
    expect(stripped.merged.SIGNALER_AUDIT_MODE).toBe("true");
  });
});

describe("resolve-serve-env consent", () => {
  it("skips inferred env in non-interactive mode without --yes", async () => {
    const root = await mkdtemp(join(tmpdir(), "signaler-consent-"));
    await writeFile(
      join(root, "package.json"),
      JSON.stringify({ dependencies: { "better-auth": "^1.0.0" } }),
    );
    const { resolveServeEnvWithConsent } = await import("../src/engine/explore/resolve-serve-env.js");
    const result = await resolveServeEnvWithConsent({
      projectRoot: root,
      nonInteractive: true,
    });
    expect(result.inferredDeclined).toBe(true);
    expect(result.serveEnv?.DEMO_AUTH_BYPASS).toBeUndefined();
  });

  it("auto-confirms inferred env with --yes", async () => {
    const root = await mkdtemp(join(tmpdir(), "signaler-consent-yes-"));
    await writeFile(
      join(root, "package.json"),
      JSON.stringify({ dependencies: { "better-auth": "^1.0.0" } }),
    );
    const { resolveServeEnvWithConsent } = await import("../src/engine/explore/resolve-serve-env.js");
    const result = await resolveServeEnvWithConsent({
      projectRoot: root,
      yes: true,
    });
    expect(result.inferredDeclined).toBe(false);
    expect(result.serveEnv?.DEMO_AUTH_BYPASS).toBe("true");
  });
});
