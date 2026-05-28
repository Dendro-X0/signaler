import { describe, expect, it } from "vitest";
import { evaluateLinksCheckStatus, formatLinksCheckStatusLabel } from "../src/links-check-status.js";

describe("links check status", () => {
  it("returns inconclusive when no URLs discovered", () => {
    expect(evaluateLinksCheckStatus({ discoveredCount: 0, brokenCount: 0 })).toBe("inconclusive");
  });

  it("returns fail when broken links exist", () => {
    expect(evaluateLinksCheckStatus({ discoveredCount: 5, brokenCount: 1 })).toBe("fail");
  });

  it("returns pass when links were checked and none broken", () => {
    expect(evaluateLinksCheckStatus({ discoveredCount: 3, brokenCount: 0 })).toBe("pass");
  });

  it("formats inconclusive label", () => {
    expect(formatLinksCheckStatusLabel("inconclusive")).toContain("0 URLs discovered");
  });
});
