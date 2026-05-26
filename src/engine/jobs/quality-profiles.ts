import type { EngineJobStepV1, EngineJobV1 } from "../../engine-contracts/jobs/index.js";
import type { BuildPresetJobParams } from "./presets.js";
import { buildRunProfileJob } from "./run-profiles.js";

export const QUALITY_PROFILE_NAMES = ["web-quality"] as const;

export type QualityProfileName = (typeof QUALITY_PROFILE_NAMES)[number];

export function parseQualityProfileName(value: string): QualityProfileName {
  const normalized = value.trim();
  if ((QUALITY_PROFILE_NAMES as readonly string[]).includes(normalized)) {
    return normalized as QualityProfileName;
  }
  throw new Error(
    `Invalid --quality-profile value: ${value}. Expected one of: ${QUALITY_PROFILE_NAMES.join(", ")}.`,
  );
}

function configArgs(configPath?: string): string[] {
  if (!configPath || configPath.trim().length === 0) {
    return [];
  }
  return ["--config", configPath];
}

function buildSideRunnerSteps(params: BuildPresetJobParams): EngineJobStepV1[] {
  const cfg = configArgs(params.configPath);
  return [
    { command: "headers", args: cfg },
    { command: "links", args: cfg },
    { command: "bundle", args: ["--project-root", params.cwd] },
  ];
}

/**
 * Bundled quality profiles (v5): Lighthouse CI gate + headers + links + bundle in one job.
 */
export function buildQualityProfileJob(
  params: BuildPresetJobParams & { readonly qualityProfile: QualityProfileName },
): EngineJobV1 {
  switch (params.qualityProfile) {
    case "web-quality": {
      const base = buildRunProfileJob({ ...params, runProfile: "ci-strict" });
      return {
        ...base,
        preset: "custom",
        qualityProfile: "web-quality",
        steps: [...base.steps, ...buildSideRunnerSteps(params)],
      };
    }
    default: {
      const exhaustive: never = params.qualityProfile;
      throw new Error(`Unsupported quality profile: ${String(exhaustive)}`);
    }
  }
}
