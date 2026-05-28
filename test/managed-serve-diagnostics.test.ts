import { describe, expect, it } from "vitest";
import { formatManagedServeStartTimeout } from "../src/engine/serve/managed-serve-diagnostics.js";

describe("managed serve diagnostics", () => {
  it("formats actionable timeout diagnostics", () => {
    const message = formatManagedServeStartTimeout({
      mode: "dev",
      baseUrl: "http://127.0.0.1:3000",
      timeoutMs: 180_000,
      requestedProjectRoot: "/repo",
      resolvedProjectRoot: "/repo/apps/web",
      script: "pnpm run dev",
      cause: new Error("Timed out waiting for http://127.0.0.1:3000/ to become reachable (180000ms)."),
    });
    expect(message).toContain("Managed serve (dev) startup timed out after 180000ms.");
    expect(message).toContain("Likely causes:");
    expect(message).toContain("Next checks:");
    expect(message).toContain("Monorepo hint:");
    expect(message).toContain("Cause: Timed out waiting");
  });

  it("omits monorepo hint when roots match", () => {
    const message = formatManagedServeStartTimeout({
      mode: "production",
      baseUrl: "http://127.0.0.1:3000",
      timeoutMs: 120_000,
      requestedProjectRoot: "/repo/apps/web",
      resolvedProjectRoot: "/repo/apps/web",
      script: "pnpm run start",
    });
    expect(message).not.toContain("Monorepo hint:");
  });
});
