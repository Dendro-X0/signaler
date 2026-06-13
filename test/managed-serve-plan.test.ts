import { mkdir, writeFile } from "node:fs/promises";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { parseManagedServeMode, resolveDevServePlan } from "../src/engine/serve/index.js";

describe("managed serve plans", () => {
  it("parses managed serve mode", () => {
    expect(parseManagedServeMode("dev")).toBe("dev");
    expect(parseManagedServeMode("auto")).toBe("auto");
    expect(parseManagedServeMode(undefined)).toBe("production");
  });

  it("resolves dev script from project root", async () => {
    const root = await mkdtemp(join(tmpdir(), "signaler-dev-plan-"));
    try {
      await writeFile(
        join(root, "package.json"),
        JSON.stringify({ scripts: { dev: "next dev", build: "next build", start: "next start" } }),
        "utf8",
      );
      const plan = await resolveDevServePlan({ projectRoot: root });
      expect(plan.projectRoot).toBe(root);
      expect(plan.devScript).toBe("dev");
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });
});
