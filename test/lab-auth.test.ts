import { describe, expect, it } from "vitest";
import { loadConfig } from "../src/core/config.js";
import { isLocalBaseUrl, assertLocalLabAuth } from "../src/lab-auth/local-url.js";
import { mergeSessions } from "../src/lab-auth/resolve-auth-session.js";

describe("lab auth local URL guard", () => {
  it("allows localhost and 127.0.0.1", () => {
    expect(isLocalBaseUrl("http://127.0.0.1:3000")).toBe(true);
    expect(isLocalBaseUrl("http://localhost:3000")).toBe(true);
  });

  it("rejects public hosts", () => {
    expect(isLocalBaseUrl("https://example.com")).toBe(false);
    expect(() => assertLocalLabAuth("https://example.com")).toThrow(/only allowed for local/);
  });
});

describe("lab auth config parsing", () => {
  it("parses extended auth block", async () => {
    const dir = `${process.cwd()}/test/fixtures/lab-auth-config`;
    const loaded = await loadConfig({ configPath: `${dir}/signaler.config.json` });
    expect(loaded.config.auth?.lab).toBe(true);
    expect(loaded.config.auth?.warmupUrl).toBe("/api/demo-auth");
    expect(loaded.config.auth?.protectedPathPrefixes).toEqual(["/dashboard/"]);
    expect(loaded.config.pages[0]?.authProfile).toBe("user");
  });
});

describe("mergeSessions", () => {
  it("merges cookies and custom headers", () => {
    const merged = mergeSessions(
      { cookieHeader: "a=1", headers: { "X-Lab": "1" } },
      { cookieHeader: "b=2" },
    );
    expect(merged.cookieHeader).toBe("a=1; b=2");
    expect(merged.headers).toEqual({ "X-Lab": "1" });
  });
});
