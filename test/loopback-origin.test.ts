import { describe, expect, it } from "vitest";
import { originsEquivalent, resolveInternalUrl } from "../src/loopback-origin.js";

describe("loopback origin", () => {
  it("treats localhost and 127.0.0.1 as equivalent on the same port", () => {
    expect(originsEquivalent("http://localhost:3000", "http://127.0.0.1:3000")).toBe(true);
    expect(originsEquivalent("http://127.0.0.1:3000", "http://localhost:3000")).toBe(true);
  });

  it("rejects different ports on loopback", () => {
    expect(originsEquivalent("http://localhost:3000", "http://127.0.0.1:5173")).toBe(false);
  });

  it("rejects non-loopback origins", () => {
    expect(originsEquivalent("http://localhost:3000", "https://example.com")).toBe(false);
  });

  it("rewrites sitemap localhost URLs to audit base origin", () => {
    expect(resolveInternalUrl("http://localhost:3000/blog/post", "http://127.0.0.1:3000")).toBe(
      "http://127.0.0.1:3000/blog/post",
    );
  });

  it("returns undefined for external origins", () => {
    expect(resolveInternalUrl("https://example.com/page", "http://127.0.0.1:3000")).toBeUndefined();
  });
});
