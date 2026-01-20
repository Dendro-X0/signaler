/**
 * Provides CLI help text for folder mode.
 */
export function folderCliHelp(): string {
  return [
    "Folder mode:",
    "  signaler folder --root <dir> [--route-cap <n>] [--bundle-only] [--output-dir <path>] [--engine-json]",
    "",
    "Notes:",
    "  - Serves the folder via a local static server (SPA fallback OFF)",
    "  - Discovers up to --route-cap routes (default 50)",
    "  - Safety caps total page/device combinations (default 200); truncates if exceeded",
    "  - --bundle-only skips Lighthouse and only runs bundle scanning against --root",
    "  - Writes artifacts to --output-dir (default .signaler/)",
  ].join("\n");
}
