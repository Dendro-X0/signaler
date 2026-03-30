import { describe, expect, it } from "vitest";
import { hasHelpFlag, resolveCommandHelpTopic } from "../src/help-routing.js";

describe("help routing", () => {
  it("detects help flags", () => {
    expect(hasHelpFlag(["node", "signaler", "run", "--help"])).toBe(true);
    expect(hasHelpFlag(["node", "signaler", "run", "-h"])).toBe(true);
    expect(hasHelpFlag(["node", "signaler", "run"])).toBe(false);
  });

  it("maps aliases to canonical command help topics", () => {
    expect(resolveCommandHelpTopic("audit")).toBe("run");
    expect(resolveCommandHelpTopic("init")).toBe("discover");
    expect(resolveCommandHelpTopic("wizard")).toBe("discover");
    expect(resolveCommandHelpTopic("guide")).toBe("discover");
    expect(resolveCommandHelpTopic("review")).toBe("report");
  });

  it("returns undefined for non-routable command topics", () => {
    expect(resolveCommandHelpTopic("help")).toBeUndefined();
    expect(resolveCommandHelpTopic("version")).toBeUndefined();
  });
});
