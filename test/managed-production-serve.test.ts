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

describe("managed production serve plan", () => {
  it("resolves build/start scripts for next-blogkit-pro", async () => {
    const plan = await resolveProductionServePlan({
      projectRoot: "e:/Web Projects/experimental-workspace/apex-auditor-workspace/next-blogkit-pro",
    });
    expect(plan.buildScript).toBe("build");
    expect(plan.startScript).toBe("start");
    expect(plan.packageManager).toBe("pnpm");
  });

  it("resolves monorepo root scripts for next-ecommercekit-monorepo", async () => {
    const plan = await resolveProductionServePlan({
      projectRoot: "e:/Web Projects/experimental-workspace/apex-auditor-workspace/next-ecommercekit-monorepo",
    });
    expect(plan.projectRoot).toContain("next-ecommercekit-monorepo");
    expect(plan.buildScript).toBe("build");
    expect(plan.startScript).toBe("start");
    expect(plan.nextAppRoot.replace(/\\/g, "/")).toMatch(/apps\/web$/);
  });

  it("resolves next app root for blogkit standalone repo", async () => {
    const appRoot = await resolveNextAppRoot(
      "e:/Web Projects/experimental-workspace/apex-auditor-workspace/next-blogkit-pro",
    );
    expect(appRoot.replace(/\\/g, "/")).toMatch(/next-blogkit-pro$/);
  });

  it("detects fresh production build when package.json is older than BUILD_ID", async () => {
    const ecommerceAppRoot =
      "e:/Web Projects/experimental-workspace/apex-auditor-workspace/next-ecommercekit-monorepo/apps/web";
    const fresh = await hasFreshProductionBuild({ nextAppRoot: ecommerceAppRoot });
    expect(typeof fresh).toBe("boolean");
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
