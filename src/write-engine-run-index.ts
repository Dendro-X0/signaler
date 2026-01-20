import { writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import type { EngineRunIndex } from "./engine-run-index.js";

/**
 * Write the engine run index file into the output directory.
 */
export async function writeEngineRunIndex(params: {
  readonly outputDir: string;
  readonly index: EngineRunIndex;
}): Promise<void> {
  const outPath: string = resolve(params.outputDir, "run.json");
  await writeFile(outPath, `${JSON.stringify(params.index, null, 2)}\n`, "utf8");
}
