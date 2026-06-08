import { describe, expect, it } from "vitest";
import { isSameExecPath, normalizeExecPath } from "../src/exec-path.js";

describe("exec-path", () => {
  it("normalizes Git Bash MSYS paths on Windows", () => {
    const normalized = normalizeExecPath(
      "/c/Users/example/project/node_modules/@signaler/cli/src/bin.js",
    );
    expect(normalized.toLowerCase()).toBe(
      "c:\\users\\example\\project\\node_modules\\@signaler\\cli\\src\\bin.js",
    );
  });

  it("matches MSYS argv paths against Windows module paths", () => {
    expect(
      isSameExecPath(
        "/c/Users/example/project/node_modules/@signaler/cli/src/bin.js",
        "C:\\Users\\example\\project\\node_modules\\@signaler\\cli\\src\\bin.js",
      ),
    ).toBe(true);
  });
});
