import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

type PackageJson = {
  readonly version?: unknown;
};

export async function readEngineVersion(): Promise<string> {
  const here: string = dirname(fileURLToPath(import.meta.url));
  const pkgPath: string = resolve(here, "..", "package.json");
  const raw: string = await readFile(pkgPath, "utf8");
  const parsed: PackageJson = JSON.parse(raw) as PackageJson;
  if (typeof parsed.version === "string" && parsed.version.trim().length > 0) {
    return parsed.version;
  }
  return "0.0.0";
}
