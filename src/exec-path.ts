import { realpathSync } from "node:fs";
import { resolve } from "node:path";

/**
 * Normalize a script path for direct-execution checks.
 * Handles Git Bash MSYS paths (`/c/Users/...`) on Windows.
 */
export function normalizeExecPath(path: string): string {
  const trimmed = path.trim();
  if (trimmed.length === 0) {
    return trimmed;
  }

  const msysMatch = trimmed.match(/^\/([a-zA-Z])\/(.*)$/);
  if (msysMatch && process.platform === "win32") {
    const drive = msysMatch[1]?.toUpperCase() ?? "";
    const rest = msysMatch[2]?.replace(/\//g, "\\") ?? "";
    return resolve(`${drive}:\\${rest}`);
  }

  try {
    return realpathSync.native(trimmed);
  } catch {
    return resolve(trimmed);
  }
}

export function isSameExecPath(left: string, right: string): boolean {
  return normalizeExecPath(left) === normalizeExecPath(right);
}
