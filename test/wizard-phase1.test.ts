import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { describe, expect, it } from "vitest";
import type { ApexPageConfig } from "../src/core/types.js";
import { buildDiscoverySummary, parseWizardArgs, runWizardCli } from "../src/wizard-cli.js";

describe("wizard phase1 args", () => {
  it("defaults scope to full when not provided", () => {
    const parsed = parseWizardArgs([
      "node",
      "signaler",
      "discover",
    ]);
    expect(parsed.scope).toBe("full");
  });

  it("parses non-interactive discover args", () => {
    const parsed = parseWizardArgs([
      "node",
      "signaler",
      "discover",
      "--scope",
      "file",
      "--routes-file",
      "routes.txt",
      "--base-url",
      "http://127.0.0.1:3000",
      "--project-root",
      "demo",
      "--profile",
      "custom",
      "--non-interactive",
      "--yes",
    ]);
    expect(parsed.scope).toBe("file");
    expect(parsed.routesFile).toBe("routes.txt");
    expect(parsed.baseUrl).toBe("http://127.0.0.1:3000");
    expect(parsed.projectRoot).toBe("demo");
    expect(parsed.profile).toBe("custom");
    expect(parsed.nonInteractive).toBe(true);
    expect(parsed.yes).toBe(true);
  });
});

describe("wizard phase1 discovery summary", () => {
  it("includes v5 status and strategy fields", () => {
    const pages: readonly ApexPageConfig[] = [
      { path: "/", label: "home", devices: ["mobile", "desktop"] },
    ];
    const summary = buildDiscoverySummary({
      repoRoot: "/tmp/demo",
      baseUrl: "http://127.0.0.1:3000",
      scopeRequested: "full",
      scopeUsed: "full",
      detectedTotal: 5,
      pages,
      excludedDynamic: ["/blog/[slug]"],
      excludedByFilter: 1,
      excludedByScope: 2,
      status: "warn",
      warnings: ["Excluded dynamic routes."],
      routeCap: 200,
      source: "mixed",
    });
    expect(summary.scopeRequested).toBe("full");
    expect(summary.scopeResolved).toBe("full");
    expect(summary.status).toBe("warn");
    expect(summary.strategy.source).toBe("mixed");
    expect(summary.strategy.routeCap).toBe(200);
  });
});

describe("wizard phase1 non-interactive failures", () => {
  it("writes discovery.json with status=error when scope=file lacks routes-file", async () => {
    const root = await mkdtemp(join(tmpdir(), "signaler-wizard-phase1-"));
    const configPath = resolve(root, "signaler.config.json");
    let threw = false;
    try {
      await runWizardCli([
        "node",
        "signaler",
        "discover",
        "--config",
        configPath,
        "--scope",
        "file",
        "--non-interactive",
        "--yes",
      ]);
    } catch {
      threw = true;
    }
    expect(threw).toBe(true);
    const raw = await readFile(resolve(root, ".signaler", "discovery.json"), "utf8");
    const parsed = JSON.parse(raw) as { readonly status?: string };
    expect(parsed.status).toBe("error");
    await rm(root, { recursive: true, force: true });
  });
});
