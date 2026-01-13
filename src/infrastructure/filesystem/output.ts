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