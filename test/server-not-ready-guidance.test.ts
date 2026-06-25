import { describe, expect, it } from "vitest";
import { mkdtemp } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { formatServerNotReadyGuidance } from "../src/engine/explore/server-not-ready-guidance.js";

describe("server-not-ready-guidance", () => {
  it("prints gentle dev-server suggestion without error tone", async () => {
    const root = await mkdtemp(join(tmpdir(), "signaler-guidance-"));
    const guidance = await formatServerNotReadyGuidance({
      projectRoot: root,
      baseUrl: "http://127.0.0.1:3000",
      reason: "no-server",
    });
    expect(guidance).toContain("not running yet");
    expect(guidance).toContain("Start your development server");
    expect(guidance).toContain("signaler audit");
    expect(guidance).not.toContain("[ERROR]");
    expect(guidance).not.toContain("--managed-serve");
  });

  it("mentions managed-serve failure without blaming the user", async () => {
    const root = await mkdtemp(join(tmpdir(), "signaler-guidance-ms-"));
    const guidance = await formatServerNotReadyGuidance({
      projectRoot: root,
      baseUrl: "http://127.0.0.1:3000",
      reason: "managed-serve-failed",
    });
    expect(guidance).toContain("could not start a production-like server");
    expect(guidance).toContain("dev server yourself");
  });
});
