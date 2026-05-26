import { readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { loadConfig } from "./core/config.js";
import type { QualityPackConfig } from "./core/types.js";

export type QualityPackViolation = {
  readonly id: string;
  readonly message: string;
  readonly severity: "critical";
};

export type QualityPackResult = {
  readonly schemaVersion: 1;
  readonly profile: string;
  readonly passed: boolean;
  readonly violations: readonly QualityPackViolation[];
  readonly evaluatedAt: string;
  readonly summary: {
    readonly headerFailures: number;
    readonly brokenLinks: number;
    readonly bundleScanned: boolean;
    readonly bundleFileCount: number;
  };
  readonly artifacts: {
    readonly agentIndex: string;
    readonly headers: string;
    readonly links: string;
    readonly bundle: string;
  };
};

type HeadersArtifact = {
  readonly results?: readonly {
    readonly missing?: readonly string[];
    readonly runtimeErrorMessage?: string;
  }[];
};

type LinksArtifact = {
  readonly broken?: readonly unknown[];
};

type BundleArtifact = {
  readonly totals?: { readonly fileCount?: number };
  readonly meta?: { readonly detected?: { readonly nextDir?: boolean; readonly distDir?: boolean } };
};

const DEFAULT_PACK: Required<Pick<QualityPackConfig, "maxHeaderFailures" | "maxBrokenLinks">> = {
  maxHeaderFailures: 0,
  maxBrokenLinks: 0,
};

function countHeaderFailures(report: HeadersArtifact | null): number {
  if (!report?.results) {
    return 0;
  }
  return report.results.filter(
    (row) => (row.missing?.length ?? 0) > 0 || Boolean(row.runtimeErrorMessage),
  ).length;
}

export function evaluateQualityPack(params: {
  readonly profile: string;
  readonly pack?: QualityPackConfig;
  readonly headers: HeadersArtifact | null;
  readonly links: LinksArtifact | null;
  readonly bundle: BundleArtifact | null;
}): QualityPackResult {
  const limits = { ...DEFAULT_PACK, ...params.pack };
  const violations: QualityPackViolation[] = [];

  const headerFailures = countHeaderFailures(params.headers);
  if (params.headers === null) {
    violations.push({
      id: "headers-missing",
      message: "headers.json not found after quality profile run.",
      severity: "critical",
    });
  } else if (headerFailures > limits.maxHeaderFailures) {
    violations.push({
      id: "max-header-failures",
      message: `${headerFailures} route(s) failed security headers (max ${limits.maxHeaderFailures}).`,
      severity: "critical",
    });
  }

  const brokenLinks = params.links?.broken?.length ?? 0;
  if (params.links === null) {
    violations.push({
      id: "links-missing",
      message: "links.json not found after quality profile run.",
      severity: "critical",
    });
  } else if (brokenLinks > limits.maxBrokenLinks) {
    violations.push({
      id: "max-broken-links",
      message: `${brokenLinks} broken link(s) (max ${limits.maxBrokenLinks}).`,
      severity: "critical",
    });
  }

  const bundleDetected =
    Boolean(params.bundle?.meta?.detected?.nextDir) || Boolean(params.bundle?.meta?.detected?.distDir);
  const bundleFileCount = params.bundle?.totals?.fileCount ?? 0;
  if (params.bundle === null) {
    violations.push({
      id: "bundle-missing",
      message: "bundle-audit.json not found after quality profile run.",
      severity: "critical",
    });
  } else if (bundleDetected && bundleFileCount === 0) {
    violations.push({
      id: "bundle-empty",
      message: "Build output detected but bundle scan found 0 files.",
      severity: "critical",
    });
  }

  return {
    schemaVersion: 1,
    profile: params.profile,
    passed: violations.length === 0,
    violations,
    evaluatedAt: new Date().toISOString(),
    summary: {
      headerFailures,
      brokenLinks,
      bundleScanned: params.bundle !== null,
      bundleFileCount,
    },
    artifacts: {
      agentIndex: "agent-index.json",
      headers: "headers.json",
      links: "links.json",
      bundle: "bundle-audit.json",
    },
  };
}

async function readJsonIfExists<T>(path: string): Promise<T | null> {
  try {
    const raw = await readFile(path, "utf8");
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

export async function evaluateAndWriteQualityPack(params: {
  readonly outputDir: string;
  readonly profile: string;
  readonly cwd: string;
  readonly configPath?: string;
}): Promise<QualityPackResult> {
  const outputDir = resolve(params.outputDir);
  let packConfig: QualityPackConfig | undefined;
  if (params.configPath) {
    const { config } = await loadConfig({ configPath: resolve(params.cwd, params.configPath) });
    packConfig = config.qualityPack;
  }

  const headers = await readJsonIfExists<HeadersArtifact>(resolve(outputDir, "headers.json"));
  const links = await readJsonIfExists<LinksArtifact>(resolve(outputDir, "links.json"));
  const bundle = await readJsonIfExists<BundleArtifact>(resolve(outputDir, "bundle-audit.json"));

  const result = evaluateQualityPack({
    profile: params.profile,
    pack: packConfig,
    headers,
    links,
    bundle,
  });

  await writeFile(resolve(outputDir, "quality-pack.json"), `${JSON.stringify(result, null, 2)}\n`, "utf8");
  return result;
}

export function mergeQualityPackExitCode(priorExitCode: number, pack: QualityPackResult): number {
  if (priorExitCode !== 0) {
    return priorExitCode;
  }
  return pack.passed ? 0 : 1;
}

export function formatQualityPackFailures(pack: QualityPackResult): string {
  return pack.violations.map((v) => `- ${v.message}`).join("\n");
}
