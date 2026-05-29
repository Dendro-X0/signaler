import type { EngineJobStepV1, EngineJobV1 } from "../../engine-contracts/jobs/index.js";
import type { BuildPresetJobParams } from "./presets.js";
import { buildRunProfileJob } from "./run-profiles.js";

export const QUALITY_PROFILE_NAMES = ["web-quality", "pr-quality"] as const;

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

export const QUALITY_SIDE_RUNNER_COMMANDS = [
  "headers",
  "links",
  "health",
  "console",
  "measure",
  "accessibility",
  "bundle",
] as const;

export function isQualitySideRunnerCommand(command: string): boolean {
  return (QUALITY_SIDE_RUNNER_COMMANDS as readonly string[]).includes(command);
}

export function shouldContinueQualityProfileJobAfterStepFailure(params: {
  readonly qualityProfile?: string;
  readonly command: string;
  readonly runStepSucceeded: boolean;
  readonly remainingSteps: readonly EngineJobStepV1[];
}): boolean {
  if (!params.qualityProfile) {
    return false;
  }
  const hasRemainingSideRunners = params.remainingSteps.some((step) =>
    isQualitySideRunnerCommand(step.command),
  );
  if (!hasRemainingSideRunners) {
    return false;
  }
  if (params.command === "analyze" && params.runStepSucceeded) {
    return true;
  }
  return isQualitySideRunnerCommand(params.command);
}

function buildSideRunnerSteps(params: BuildPresetJobParams): EngineJobStepV1[] {
  const cfg = configArgs(params.configPath);
  return [
    { command: "headers", args: cfg },
    { command: "links", args: cfg },
    { command: "health", args: cfg },
    { command: "console", args: cfg },
    { command: "measure", args: cfg },
    { command: "accessibility", args: cfg },
    { command: "bundle", args: ["--project-root", params.cwd] },
  ];
}

/**
 * Bundled quality profiles (v5): Lighthouse CI gate + side runners in one job.
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
    case "pr-quality": {
      const base = buildRunProfileJob({ ...params, runProfile: "pr-quick" });
      return {
        ...base,
        preset: "custom",
        qualityProfile: "pr-quality",
        steps: [...base.steps, ...buildSideRunnerSteps(params)],
      };
    }
    default: {
      const exhaustive: never = params.qualityProfile;
      throw new Error(`Unsupported quality profile: ${String(exhaustive)}`);
    }
  }
}
