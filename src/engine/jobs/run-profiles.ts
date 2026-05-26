import type { EngineJobV1 } from "../../engine-contracts/jobs/index.js";
import {
  buildAgentPresetJob,
  buildCiPresetJob,
  buildPrPresetJob,
  type BuildPresetJobParams,
} from "./presets.js";

export const RUN_PROFILE_NAMES = ["ci-strict", "pr-quick", "release-full"] as const;

export type RunProfileName = (typeof RUN_PROFILE_NAMES)[number];

export function parseRunProfileName(value: string): RunProfileName {
  const normalized = value.trim();
  if ((RUN_PROFILE_NAMES as readonly string[]).includes(normalized)) {
    return normalized as RunProfileName;
  }
  throw new Error(
    `Invalid --run-profile value: ${value}. Expected one of: ${RUN_PROFILE_NAMES.join(", ")}.`,
  );
}

function appendRunArgs(job: EngineJobV1, extraArgs: readonly string[]): EngineJobV1 {
  return {
    ...job,
    steps: job.steps.map((step) => {
      if (step.command !== "run") {
        return step;
      }
      const args = [...(step.args ?? [])];
      for (const flag of extraArgs) {
        if (!args.includes(flag)) {
          args.push(flag);
        }
      }
      return { ...step, args };
    }),
  };
}

function patchRunStepMode(job: EngineJobV1, mode: "throughput" | "fidelity"): EngineJobV1 {
  return {
    ...job,
    steps: job.steps.map((step) => {
      if (step.command !== "run") {
        return step;
      }
      const args = [...(step.args ?? [])];
      const modeIndex = args.indexOf("--mode");
      if (modeIndex >= 0 && modeIndex + 1 < args.length) {
        args[modeIndex + 1] = mode;
      } else {
        args.push("--mode", mode);
      }
      return { ...step, args };
    }),
  };
}

/**
 * Named run profiles for policy-as-code CI (v4.3).
 * CLI flags (--scope, --parallel) override profile defaults when provided.
 */
export function buildRunProfileJob(
  params: BuildPresetJobParams & { readonly runProfile: RunProfileName },
): EngineJobV1 {
  const discoverScope = params.discoverScope;
  switch (params.runProfile) {
    case "ci-strict": {
      const job = appendRunArgs(
        buildCiPresetJob({
          ...params,
          discoverScope: discoverScope ?? "full",
        }),
        ["--fail-on-quality-gate", "--fail-on-baseline-compare"],
      );
      return { ...job, preset: "custom", runProfile: "ci-strict" };
    }
    case "pr-quick": {
      const job = appendRunArgs(buildPrPresetJob(params), ["--fail-on-baseline-compare"]);
      return { ...job, preset: "custom", runProfile: "pr-quick" };
    }
    case "release-full": {
      const job = buildAgentPresetJob({
        ...params,
        discoverScope: discoverScope ?? "full",
        parallel: params.parallel ?? 2,
      });
      return {
        ...patchRunStepMode(job, "fidelity"),
        preset: "custom",
        runProfile: "release-full",
      };
    }
    default: {
      const exhaustive: never = params.runProfile;
      throw new Error(`Unsupported run profile: ${String(exhaustive)}`);
    }
  }
}
