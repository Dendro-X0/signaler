import prompts from "prompts";
import { readServeEnvFromProcessEnv } from "../../core/config.js";
import { inferAuditServeEnv } from "./infer-audit-serve-env.js";
import {
  buildServeEnvPlan,
  formatServeEnvDisclosure,
  stripInferredEntries,
  type ServeEnvPlan,
} from "./serve-env-policy.js";

export type ResolveServeEnvConsentParams = {
  readonly projectRoot: string;
  readonly fromConfig?: Readonly<Record<string, string>>;
  readonly fromCli?: Readonly<Record<string, string>>;
  readonly auditBypass?: boolean;
  readonly yes?: boolean;
  readonly nonInteractive?: boolean;
};

export type ResolveServeEnvConsentResult = {
  readonly serveEnv?: Readonly<Record<string, string>>;
  readonly plan: ServeEnvPlan;
  readonly inferredDeclined: boolean;
};

async function confirmInferredInjection(plan: ServeEnvPlan): Promise<boolean> {
  console.log(formatServeEnvDisclosure(plan));
  console.log("");
  const answer = await prompts({
    type: "confirm",
    name: "inject",
    message:
      "Inject Signaler lab environment for this audit? (local managed serve only; cleaned up when Signaler stops the server)",
    initial: true,
  });
  return answer.inject === true;
}

/**
 * Build serve env with optional user consent for inferred audit-lab variables.
 * Non-interactive without --yes skips inferred injection (safe default).
 */
export async function resolveServeEnvWithConsent(
  params: ResolveServeEnvConsentParams,
): Promise<ResolveServeEnvConsentResult> {
  const inferred =
    params.auditBypass === false
      ? undefined
      : await inferAuditServeEnv(params.projectRoot);

  const plan = buildServeEnvPlan({
    fromProcess: readServeEnvFromProcessEnv(),
    inferred,
    fromConfig: params.fromConfig,
    fromCli: params.fromCli,
  });

  if (!plan.hasInferred) {
    return {
      serveEnv: Object.keys(plan.merged).length > 0 ? plan.merged : undefined,
      plan,
      inferredDeclined: false,
    };
  }

  if (params.yes === true) {
    console.log(formatServeEnvDisclosure(plan));
    console.log("Auto-confirmed lab environment injection (--yes).\n");
    return { serveEnv: plan.merged, plan, inferredDeclined: false };
  }

  if (params.nonInteractive === true) {
    const stripped = stripInferredEntries(plan);
    console.log(
      "Skipped inferred lab environment (non-interactive). Pass --yes to auto-inject or set values in signaler.config.json serveEnv.\n",
    );
    return {
      serveEnv: Object.keys(stripped.merged).length > 0 ? stripped.merged : undefined,
      plan: stripped,
      inferredDeclined: true,
    };
  }

  const approved = await confirmInferredInjection(plan);
  if (approved) {
    return { serveEnv: plan.merged, plan, inferredDeclined: false };
  }

  const stripped = stripInferredEntries(plan);
  console.log("Lab environment injection declined — continuing without inferred bypass flags.\n");
  return {
    serveEnv: Object.keys(stripped.merged).length > 0 ? stripped.merged : undefined,
    plan: stripped,
    inferredDeclined: true,
  };
}
