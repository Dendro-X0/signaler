import { describe, expect, it } from "vitest";
import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { join, resolve } from "node:path";
import { tmpdir } from "node:os";
import { parseArgs, validatePublishContext } from "../scripts/jsr-publish.js";

describe("jsr publish helper script", () => {
  it("parses publish helper args", () => {
    const parsed = parseArgs(["--", "--skip-build", "--dry-run"]);
    expect(parsed.skipBuild).toBe(true);
    expect(parsed.dryRun).toBe(true);
    expect(parsed.allowSlowTypes).toBe(true);
  });

  it("validates publish context when package/jsr versions match", async () => {
    const root = await mkdtemp(join(tmpdir(), "signaler-jsr-publish-ok-"));
    try {
      await writeFile(resolve(root, "package.json"), JSON.stringify({ version: "3.1.3" }, null, 2), "utf8");
      await writeFile(resolve(root, "jsr.json"), JSON.stringify({ version: "3.1.3" }, null, 2), "utf8");
      const result = validatePublishContext(root);
      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.version).toBe("3.1.3");
      }
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });

  it("reports helpful hint when invoked from workspace root with nested signaler", async () => {
    const root = await mkdtemp(join(tmpdir(), "signaler-jsr-publish-hint-"));
    try {
      const nestedSignaler = resolve(root, "signaler");
      await mkdir(nestedSignaler, { recursive: true });
      await writeFile(resolve(nestedSignaler, "jsr.json"), JSON.stringify({ version: "3.1.3" }, null, 2), "utf8");
      const result = validatePublishContext(root);
      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.hint.toLowerCase()).toContain("cd");
        expect(result.hint.toLowerCase()).toContain("signaler");
      }
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });
});
