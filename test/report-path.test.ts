import { mkdir, writeFile } from "node:fs/promises";
import { mkdtemp } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { resolveReportHtmlPath } from "../src/report-path.js";

describe("resolveReportHtmlPath", () => {
  it("prefers tree layout developer/report.html when present", async () => {
    const root = await mkdtemp(join(tmpdir(), "signaler-report-path-"));
    await mkdir(join(root, "developer"), { recursive: true });
    await writeFile(join(root, "developer", "report.html"), "<html></html>", "utf8");
    await writeFile(join(root, "report.html"), "<html>flat</html>", "utf8");
    expect(resolveReportHtmlPath(root)).toBe(join(root, "developer", "report.html"));
  });

  it("falls back to flat report.html", async () => {
    const root = await mkdtemp(join(tmpdir(), "signaler-report-path-"));
    await writeFile(join(root, "report.html"), "<html>flat</html>", "utf8");
    expect(resolveReportHtmlPath(root)).toBe(join(root, "report.html"));
  });
});
