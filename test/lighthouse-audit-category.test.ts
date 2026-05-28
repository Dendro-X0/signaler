import { describe, expect, it } from "vitest";
import { inferLighthouseIssueCategory } from "../src/lighthouse-audit-category.js";

describe("lighthouse audit category", () => {
  it("maps seo audits", () => {
    expect(inferLighthouseIssueCategory({ issueId: "document-title", kind: "audit" })).toBe("seo");
    expect(inferLighthouseIssueCategory({ issueId: "meta-description", kind: "audit" })).toBe("seo");
  });

  it("maps accessibility audits", () => {
    expect(inferLighthouseIssueCategory({ issueId: "landmark-one-main", kind: "audit" })).toBe("accessibility");
    expect(inferLighthouseIssueCategory({ issueId: "aria-valid-attr", kind: "audit" })).toBe("accessibility");
  });

  it("maps best-practices audits", () => {
    expect(inferLighthouseIssueCategory({ issueId: "errors-in-console", kind: "audit" })).toBe("best-practices");
  });

  it("defaults opportunities to performance", () => {
    expect(inferLighthouseIssueCategory({ issueId: "unused-javascript", kind: "opportunity" })).toBe("performance");
  });
});
