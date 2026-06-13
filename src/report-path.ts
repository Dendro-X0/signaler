import { existsSync } from "node:fs";
import { resolve } from "node:path";

/** Resolve the visual HTML report path (tree layout copies to developer/report.html). */
export function resolveReportHtmlPath(outputDir: string): string {
  const root = resolve(outputDir);
  const treePath = resolve(root, "developer", "report.html");
  if (existsSync(treePath)) {
    return treePath;
  }
  return resolve(root, "report.html");
}
