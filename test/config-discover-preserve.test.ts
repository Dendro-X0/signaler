import { describe, expect, it } from "vitest";
import { mergeDiscoveredConfigWithPreserved } from "../src/config-discover-preserve.js";
import type { ApexConfig } from "../src/core/types.js";

describe("mergeDiscoveredConfigWithPreserved", () => {
  it("preserves auth and serveEnv when discover rewrites pages", () => {
    const discovered: ApexConfig = {
      baseUrl: "http://127.0.0.1:3000",
      pages: [{ path: "/", label: "home", devices: ["mobile"] }],
    };
    const preserved: ApexConfig = {
      baseUrl: "http://127.0.0.1:3000",
      pages: [{ path: "/old", label: "old", devices: ["desktop"] }],
      serveEnv: { DEMO_AUTH_BYPASS: "true" },
      auth: {
        lab: true,
        warmupUrl: "/api/demo-auth?callbackUrl=/dashboard",
      },
    };
    const merged = mergeDiscoveredConfigWithPreserved(discovered, preserved);
    expect(merged.pages).toEqual(discovered.pages);
    expect(merged.serveEnv).toEqual(preserved.serveEnv);
    expect(merged.auth).toEqual(preserved.auth);
  });
});
