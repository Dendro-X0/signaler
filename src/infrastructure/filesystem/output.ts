import { resolve } from "node:path";

type ResolvedOutputDir = {
  readonly outputDir: string;
};

export function resolveOutputDir(argv: readonly string[]): ResolvedOutputDir {
  let outputDir: string = resolve(".signaler");
  for (let i: number = 2; i < argv.length; i += 1) {
    const arg: string = argv[i] ?? "";
    if ((arg === "--output-dir" || arg === "--dir") && i + 1 < argv.length) {
      const next: string = argv[i + 1] ?? "";
      if (next.trim().length > 0) {
        outputDir = resolve(next);
      }
      i += 1;
    }
  }
  return { outputDir };
}

/**
 * Resolves the default output directory with backward compatibility support.
 * Uses "signaler" as the new default, but supports "apex-auditor" during transition.
 */
export function resolveDefaultOutputDir(): string {
  // Default to new "signaler" directory
  return resolve(".signaler");
}

/**
 * Checks if legacy apex-auditor directory exists for backward compatibility.
 */
export function hasLegacyOutputDir(): boolean {
  try {
    const { existsSync } = require("node:fs");
    return existsSync(resolve(".apex-auditor"));
  } catch {
    return false;
  }
}

/**
 * Gets the appropriate output directory, preferring signaler but falling back to apex-auditor if it exists.
 */
export function getCompatibleOutputDir(): string {
  if (hasLegacyOutputDir()) {
    return resolve(".apex-auditor");
  }
  return resolve(".signaler");
}