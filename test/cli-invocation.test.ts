import { describe, expect, it } from "vitest";
import { buildRunSuggestionCommand, resolveSuggestedCommandPrefix, shellQuote } from "../src/cli-invocation.js";

describe("cli invocation helpers", () => {
  it("quotes arguments with spaces", () => {
    expect(shellQuote("simple")).toBe("simple");
    expect(shellQuote("E:\\Web Project\\signaler\\dist\\bin.js")).toBe("\"E:\\Web Project\\signaler\\dist\\bin.js\"");
  });

  it("uses local node dist/bin invocation when running from workspace source", () => {
    const prefix = resolveSuggestedCommandPrefix([
      "node",
      "E:\\Web Project\\experimental-workspace\\apex-auditor-workspace\\signaler\\dist\\bin.js",
      "run",
    ]);
    expect(prefix).toBe("node \"E:\\Web Project\\experimental-workspace\\apex-auditor-workspace\\signaler\\dist\\bin.js\"");
  });

  it("uses signaler prefix when running from installed package path", () => {
    const prefix = resolveSuggestedCommandPrefix([
      "node",
      "E:\\project\\node_modules\\@signaler\\cli\\dist\\bin.js",
      "run",
    ]);
    expect(prefix).toBe("signaler");
  });

  it("builds suggestion commands with canonical run entry", () => {
    const cmd = buildRunSuggestionCommand({
      configArg: "verify.config.json",
      targetPath: "/blog",
      device: "desktop",
      argv: [
        "node",
        "E:\\repo\\signaler\\dist\\bin.js",
        "run",
      ],
    });

    expect(cmd).toContain(" run --config verify.config.json --desktop-only --open ");
    expect(cmd).toContain("# focus on /blog");
    expect(cmd.startsWith("node E:\\repo\\signaler\\dist\\bin.js")).toBe(true);
  });
});
