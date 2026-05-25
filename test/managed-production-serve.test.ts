import { mkdir, writeFile } from "node:fs/promises";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import {
  buildLoopbackBaseUrl,
  findAvailablePort,
  hasFreshProductionBuild,
  isPortAvailable,
  resolveNextAppRoot,
  resolveProductionServePlan,
} from "../src/engine/serve/resolve-serve-plan.js";
import { probeUrlListening, probeUrlReachable } from "../src/engine/serve/url-probe.js";

const FIXTURES_ROOT = join(dirname(fileURLToPath(import.meta.url)), "fixtures/managed-serve");
const STANDALONE_NEXT_ROOT = join(FIXTURES_ROOT, "standalone-next");
const MONOREPO_NEXT_ROOT = join(FIXTURES_ROOT, "monorepo-next");
describe("managed production serve plan", () => {
  it("resolves build/start scripts for a standalone Next app", async () => {
    const plan = await resolveProductionServePlan({
      projectRoot: STANDALONE_NEXT_ROOT,
    });
    expect(plan.buildScript).toBe("build");
    expect(plan.startScript).toBe("start");
    expect(plan.packageManager).toBe("pnpm");
    expect(plan.projectRoot.replace(/\\/g, "/")).toMatch(/standalone-next$/);
  });

  it("resolves monorepo root scripts for apps/web layout", async () => {
    const plan = await resolveProductionServePlan({
      projectRoot: MONOREPO_NEXT_ROOT,
    });
    expect(plan.projectRoot.replace(/\\/g, "/")).toMatch(/monorepo-next$/);
    expect(plan.buildScript).toBe("build");
    expect(plan.startScript).toBe("start");
    expect(plan.nextAppRoot.replace(/\\/g, "/")).toMatch(/apps\/web$/);
  });

  it("resolves next app root for standalone fixture repo", async () => {
    const appRoot = await resolveNextAppRoot(STANDALONE_NEXT_ROOT);
    expect(appRoot.replace(/\\/g, "/")).toMatch(/standalone-next$/);
  });

  it("detects fresh production build when package.json is older than BUILD_ID", async () => {
    const tempRoot = await mkdtemp(join(tmpdir(), "signaler-prod-build-"));
    try {
      const nextDir = join(tempRoot, ".next");
      await mkdir(nextDir, { recursive: true });
      const buildIdPath = join(nextDir, "BUILD_ID");
      const packagePath = join(tempRoot, "package.json");
      await writeFile(buildIdPath, "fixture-build", "utf8");
      await writeFile(
        packagePath,
        JSON.stringify({ name: "fixture", scripts: { build: "next build", start: "next start" } }),
        "utf8",
      );
      const { utimes } = await import("node:fs/promises");
      const now = Date.now() / 1000;
      await utimes(packagePath, now - 120, now - 120);
      await utimes(buildIdPath, now, now);
      const fresh = await hasFreshProductionBuild({ nextAppRoot: tempRoot });
      expect(fresh).toBe(true);
    } finally {
      await rm(tempRoot, { recursive: true, force: true });
    }
  });

  it("reports stale build when package.json is newer than BUILD_ID", async () => {
    const tempRoot = await mkdtemp(join(tmpdir(), "signaler-prod-stale-"));
    try {
      const nextDir = join(tempRoot, ".next");
      await mkdir(nextDir, { recursive: true });
      const buildIdPath = join(nextDir, "BUILD_ID");
      await writeFile(buildIdPath, "fixture-build", "utf8");
      const packagePath = join(tempRoot, "package.json");
      await writeFile(
        packagePath,
        JSON.stringify({ name: "fixture", scripts: { build: "next build", start: "next start" } }),
        "utf8",
      );
      const { utimes } = await import("node:fs/promises");
      const now = Date.now() / 1000;
      await utimes(buildIdPath, now - 60, now - 60);
      await utimes(packagePath, now, now);
      const fresh = await hasFreshProductionBuild({ nextAppRoot: tempRoot });
      expect(fresh).toBe(false);
    } finally {
      await rm(tempRoot, { recursive: true, force: true });
    }
  });

  it("finds a free loopback port when preferred port is taken", async () => {
    const server = await import("node:net").then(({ createServer }) => createServer());
    const preferredPort = await new Promise<number>((resolvePort, reject) => {
      server.listen(0, "127.0.0.1", () => {
        const address = server.address();
        if (typeof address === "object" && address) {
          resolvePort(address.port);
          return;
        }
        reject(new Error("Could not resolve ephemeral port"));
      });
    });
    expect(await isPortAvailable(preferredPort)).toBe(false);
    const resolvedPort = await findAvailablePort(preferredPort);
    expect(resolvedPort).not.toBe(preferredPort);
    expect(buildLoopbackBaseUrl(resolvedPort)).toMatch(/^http:\/\/127\.0\.0\.1:\d+$/);
    await new Promise<void>((resolveClose) => server.close(() => resolveClose()));
  });
});

describe("url probe", () => {
  it("treats connection errors as not listening", async () => {
    expect(await probeUrlReachable("http://127.0.0.1:1/")).toBe(false);
    expect(await probeUrlListening("http://127.0.0.1:1/")).toBe(false);
  });
});
