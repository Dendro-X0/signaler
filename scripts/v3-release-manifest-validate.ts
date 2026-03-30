import { access, readFile } from "node:fs/promises";
import { resolve, isAbsolute } from "node:path";
import { fileURLToPath } from "node:url";
import { z } from "zod";

type GateStatus = "ok" | "warn" | "error";

type ParsedArgs = {
  readonly manifestPath: string;
  readonly rootDir: string;
  readonly requireTgzAsset: boolean;
  readonly strictGateStatus: boolean;
  readonly requireInstallScripts: boolean;
  readonly requiredGateIds: readonly string[];
};

type ManifestValidationResult =
  | { readonly ok: true; readonly warnings: readonly string[] }
  | { readonly ok: false; readonly errors: readonly string[]; readonly warnings: readonly string[] };

const assetSchema = z.object({
  path: z.string().min(1),
  sha256: z.string().regex(/^[a-f0-9]{64}$/i, "must be a 64-char hex sha256"),
  sizeBytes: z.number().int().positive(),
});

const gateSchema = z.object({
  id: z.string().min(1),
  path: z.string().min(1),
  status: z.enum(["ok", "warn", "error"]),
});

const manifestSchema = z.object({
  schemaVersion: z.literal(1),
  generatedAt: z.string().min(1),
  release: z.object({
    version: z.string().min(1),
    channel: z.enum(["rc", "ga", "patch", "canary"]),
    gitCommit: z.string().min(7),
  }),
  assets: z.array(assetSchema).min(1),
  gateReports: z.array(gateSchema).min(1),
  environment: z.object({
    nodeVersion: z.string().min(1),
    platform: z.string().min(1),
    packageManager: z.string().min(1),
  }),
});

type ReleaseManifest = z.infer<typeof manifestSchema>;

function usage(): string {
  return [
    "Usage:",
    "  tsx scripts/v3-release-manifest-validate.ts [manifest-path] [flags]",
    "",
    "Flags:",
    "  --manifest <path>             Manifest path (default release/v3/release-manifest.generated.json)",
    "  --root <path>                 Root directory for relative path checks (default .)",
    "  --allow-missing-tgz           Do not require a .tgz asset entry",
    "  --strict-gates                Require all gate statuses to be ok",
    "  --skip-install-scripts-check  Skip release/install script existence checks",
    "  --require-gate <id>           Required gate id (repeatable; default v3-release-phase1 and v63-success-gate)",
  ].join("\n");
}

function parseArgs(argv: readonly string[]): ParsedArgs {
  let manifestPath = resolve("release/v3/release-manifest.generated.json");
  let rootDir = resolve(".");
  let requireTgzAsset = true;
  let strictGateStatus = false;
  let requireInstallScripts = true;
  const requiredGateIds: string[] = ["v3-release-phase1", "v63-success-gate"];

  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i] ?? "";
    if (!arg.startsWith("-") && i === 0) {
      manifestPath = resolve(arg);
      continue;
    }
    if (arg === "--manifest" && i + 1 < argv.length) {
      manifestPath = resolve(argv[i + 1] ?? manifestPath);
      i += 1;
      continue;
    }
    if (arg.startsWith("--manifest=")) {
      manifestPath = resolve(arg.slice("--manifest=".length));
      continue;
    }
    if (arg === "--root" && i + 1 < argv.length) {
      rootDir = resolve(argv[i + 1] ?? rootDir);
      i += 1;
      continue;
    }
    if (arg.startsWith("--root=")) {
      rootDir = resolve(arg.slice("--root=".length));
      continue;
    }
    if (arg === "--allow-missing-tgz") {
      requireTgzAsset = false;
      continue;
    }
    if (arg === "--strict-gates") {
      strictGateStatus = true;
      continue;
    }
    if (arg === "--skip-install-scripts-check") {
      requireInstallScripts = false;
      continue;
    }
    if (arg === "--require-gate" && i + 1 < argv.length) {
      requiredGateIds.push((argv[i + 1] ?? "").trim());
      i += 1;
      continue;
    }
    if (arg.startsWith("--require-gate=")) {
      requiredGateIds.push(arg.slice("--require-gate=".length).trim());
      continue;
    }
    throw new Error(`Unknown argument '${arg}'.\n${usage()}`);
  }

  const normalizedGateIds = [...new Set(requiredGateIds.filter((id) => id.length > 0))];
  return {
    manifestPath,
    rootDir,
    requireTgzAsset,
    strictGateStatus,
    requireInstallScripts,
    requiredGateIds: normalizedGateIds,
  };
}

function toAbsolutePath(rootDir: string, maybeRelativePath: string): string {
  return isAbsolute(maybeRelativePath) ? maybeRelativePath : resolve(rootDir, maybeRelativePath);
}

async function pathExists(pathToFile: string): Promise<boolean> {
  try {
    await access(pathToFile);
    return true;
  } catch {
    return false;
  }
}

function uniqueValues(values: readonly string[]): readonly string[] {
  return [...new Set(values)];
}

async function validateManifest(
  manifest: ReleaseManifest,
  args: ParsedArgs,
): Promise<{ readonly errors: readonly string[]; readonly warnings: readonly string[] }> {
  const errors: string[] = [];
  const warnings: string[] = [];

  const versionPattern = /^\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?$/;
  if (!versionPattern.test(manifest.release.version)) {
    errors.push(`release.version '${manifest.release.version}' is not semver-like.`);
  }

  const assetPaths = manifest.assets.map((asset) => asset.path);
  const duplicateAssetPaths = assetPaths.filter((path, idx) => assetPaths.indexOf(path) !== idx);
  if (duplicateAssetPaths.length > 0) {
    errors.push(`duplicate asset paths found: ${uniqueValues(duplicateAssetPaths).join(", ")}`);
  }

  if (args.requireTgzAsset) {
    const hasTgz = manifest.assets.some((asset) => asset.path.toLowerCase().endsWith(".tgz"));
    if (!hasTgz) {
      errors.push("manifest must include at least one .tgz asset path.");
    }
  }

  for (const asset of manifest.assets) {
    const absoluteAssetPath = toAbsolutePath(args.rootDir, asset.path);
    if (!(await pathExists(absoluteAssetPath))) {
      errors.push(`asset path does not exist: ${asset.path}`);
    }
  }

  const gateIds = manifest.gateReports.map((gate) => gate.id);
  const duplicateGateIds = gateIds.filter((id, idx) => gateIds.indexOf(id) !== idx);
  if (duplicateGateIds.length > 0) {
    errors.push(`duplicate gate ids found: ${uniqueValues(duplicateGateIds).join(", ")}`);
  }

  for (const requiredGateId of args.requiredGateIds) {
    const gate = manifest.gateReports.find((entry) => entry.id === requiredGateId);
    if (gate === undefined) {
      errors.push(`required gate id missing: ${requiredGateId}`);
      continue;
    }
    if (gate.status === "error") {
      errors.push(`required gate ${requiredGateId} has status=error`);
    } else if (args.strictGateStatus && gate.status !== "ok") {
      errors.push(`required gate ${requiredGateId} must be ok in strict mode (received ${gate.status})`);
    } else if (gate.status === "warn") {
      warnings.push(`required gate ${requiredGateId} is warn (allowed outside strict mode)`);
    }
    const absoluteGatePath = toAbsolutePath(args.rootDir, gate.path);
    if (!(await pathExists(absoluteGatePath))) {
      errors.push(`gate report path does not exist: ${gate.path}`);
    }
  }

  const unknownPackageManager = manifest.environment.packageManager === "unknown";
  if (unknownPackageManager) {
    warnings.push("environment.packageManager is unknown.");
  }

  if (args.requireInstallScripts) {
    const requiredScripts = [
      "scripts/create-release-package.sh",
      "scripts/create-release-package.ps1",
      "scripts/setup-bash-wrapper.sh",
      "scripts/setup-bash-wrapper.ps1",
    ];
    for (const relPath of requiredScripts) {
      const absolutePath = resolve(args.rootDir, relPath);
      if (!(await pathExists(absolutePath))) {
        errors.push(`required release/install helper script missing: ${relPath}`);
      }
    }
  }

  return { errors, warnings };
}

async function validateReleaseManifestFile(args: ParsedArgs): Promise<ManifestValidationResult> {
  try {
    const raw = await readFile(args.manifestPath, "utf8");
    const parsedUnknown = JSON.parse(raw) as unknown;
    const parsed = manifestSchema.safeParse(parsedUnknown);
    if (!parsed.success) {
      const errors = parsed.error.issues.map((issue) => {
        const path = issue.path.length > 0 ? issue.path.join(".") : "(root)";
        return `${path}: ${issue.message}`;
      });
      return { ok: false, errors, warnings: [] };
    }
    const details = await validateManifest(parsed.data, args);
    if (details.errors.length > 0) {
      return { ok: false, errors: details.errors, warnings: details.warnings };
    }
    return { ok: true, warnings: details.warnings };
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    return { ok: false, errors: [`read/parse failure: ${message}`], warnings: [] };
  }
}

async function main(): Promise<void> {
  const args = parseArgs(process.argv.slice(2));
  const result = await validateReleaseManifestFile(args);
  if (!result.ok) {
    for (const error of result.errors) {
      console.error(`- ${error}`);
    }
    for (const warning of result.warnings) {
      console.warn(`- [warn] ${warning}`);
    }
    process.exitCode = 1;
    return;
  }
  for (const warning of result.warnings) {
    console.warn(`- [warn] ${warning}`);
  }
  console.log(`V3 release manifest policy is valid: ${args.manifestPath}`);
}

const SCRIPT_PATH = fileURLToPath(import.meta.url);

if (process.argv[1] !== undefined && resolve(process.argv[1]) === resolve(SCRIPT_PATH)) {
  void main().catch((error: unknown) => {
    const message = error instanceof Error ? error.message : String(error);
    console.error(`[v3-manifest-validate] ${message}`);
    process.exitCode = 1;
  });
}

export type { GateStatus, ParsedArgs, ManifestValidationResult, ReleaseManifest };
export { parseArgs, validateReleaseManifestFile };
