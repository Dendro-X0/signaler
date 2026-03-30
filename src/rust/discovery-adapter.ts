import { mkdtemp, readFile, rm } from "node:fs/promises";
import { join, resolve } from "node:path";
import { tmpdir } from "node:os";
import { isRustFeatureEnabled, runRustSidecar } from "./bridge.js";

type RustDiscoveryRoute = {
  readonly path: string;
  readonly label: string;
  readonly source: string;
};

type RustDiscoveryOutput = {
  readonly status: "ok" | "error";
  readonly detectorId?: string;
  readonly routes?: readonly RustDiscoveryRoute[];
  readonly message?: string;
};

export type RustDiscoveryAttempt = {
  readonly enabled: boolean;
  readonly used: boolean;
  readonly routes?: readonly RustDiscoveryRoute[];
  readonly detectorId?: string;
  readonly fallbackReason?: string;
};

export async function detectRoutesWithRust(params: {
  readonly projectRoot: string;
  readonly limit: number;
  readonly preferredDetectorId?: string;
}): Promise<RustDiscoveryAttempt> {
  if (!isRustFeatureEnabled("SIGNALER_RUST_DISCOVERY")) {
    return { enabled: false, used: false };
  }

  const tempDir: string = await mkdtemp(join(tmpdir(), "signaler-rust-discovery-"));
  const outPath: string = resolve(tempDir, "discover.json");
  try {
    const result = await runRustSidecar({
      args: [
        "discover-scan",
        "--project-root",
        params.projectRoot,
        "--limit",
        String(params.limit),
        "--preferred-detector",
        params.preferredDetectorId ?? "auto",
        "--out",
        outPath,
      ],
      timeoutMs: 60_000,
    });
    if (!result.ok) {
      return {
        enabled: true,
        used: false,
        fallbackReason: result.errorMessage ?? "Rust discovery sidecar failed.",
      };
    }
    const raw: string = await readFile(outPath, "utf8");
    const parsed = JSON.parse(raw) as RustDiscoveryOutput;
    if (parsed.status !== "ok" || !Array.isArray(parsed.routes)) {
      return {
        enabled: true,
        used: false,
        fallbackReason: parsed.message ?? "Rust discovery output was invalid.",
      };
    }
    return {
      enabled: true,
      used: true,
      routes: parsed.routes,
      detectorId: parsed.detectorId,
    };
  } catch (error) {
    return {
      enabled: true,
      used: false,
      fallbackReason: error instanceof Error ? error.message : "Rust discovery crashed.",
    };
  } finally {
    await rm(tempDir, { recursive: true, force: true });
  }
}
