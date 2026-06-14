import { describe, expect, it } from "vitest";
import { lighthouseExtraHeaders, mergeCookieHeaders } from "../src/runners/lighthouse/auth-session.js";

describe("auth session", () => {
  it("merges cookie fragments with later overrides", () => {
    const merged = mergeCookieHeaders("a=1; b=2", "b=9; c=3");
    expect(merged).toBe("a=1; b=9; c=3");
  });

  it("builds lighthouse extraHeaders", () => {
    expect(lighthouseExtraHeaders("session=abc")).toEqual({ Cookie: "session=abc" });
    expect(lighthouseExtraHeaders(undefined)).toBeUndefined();
  });
});
