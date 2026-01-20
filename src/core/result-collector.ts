import type { PageConfig } from "./multi-audit-engine.js";
import type { AuditDevice, AuditPlugin, AuditResult, Issue } from "./plugin-interface.js";

type PageExecutionMeta = {
  readonly startTime: number;
  readonly endTime: number;
  readonly totalExecutionMs: number;
};

type CollectedPluginResult = {
  readonly plugin: {
    readonly name: string;
    readonly type: AuditResult["type"];
    readonly phase: AuditPlugin["phase"];
    readonly dependencies: readonly string[];
  };
  readonly result: AuditResult;
};

type CollectPageResultParams = {
  readonly page: PageConfig;
  readonly device: AuditDevice;
  readonly url: string;
  readonly plugins: readonly AuditPlugin[];
  readonly pluginResults: Readonly<Record<string, AuditResult>>;
  readonly executionMeta: PageExecutionMeta;
};

type CollectPageResultReturn = {
  readonly page: PageConfig;
  readonly device: AuditDevice;
  readonly url: string;
  readonly pluginResults: Readonly<Record<string, AuditResult>>;
  readonly allIssues: readonly Issue[];
  readonly combinedMetrics: Readonly<Record<string, number>>;
  readonly executionMeta: PageExecutionMeta;
  readonly collected: {
    readonly plugins: readonly CollectedPluginResult[];
  };
  readonly validation: {
    readonly isValid: boolean;
    readonly errors: readonly string[];
  };
};

/**
 * Collects raw plugin outputs into a unified per-page result, preserving metadata
 * and validating completeness.
 */
export class ResultCollector {
  public collectPageResult(params: CollectPageResultParams): CollectPageResultReturn {
    const { page, device, url, plugins, pluginResults, executionMeta } = params;
    const expectedPluginNames: readonly string[] = plugins.map((plugin: AuditPlugin) => plugin.name);
    const validationErrors: string[] = this.validateCompleteness({ expectedPluginNames, pluginResults });
    const collectedPluginResults: readonly CollectedPluginResult[] = plugins
      .map((plugin: AuditPlugin): CollectedPluginResult | undefined => {
        const result: AuditResult | undefined = pluginResults[plugin.name];
        if (!result) {
          return undefined;
        }
        return {
          plugin: {
            name: plugin.name,
            type: result.type,
            phase: plugin.phase,
            dependencies: plugin.dependencies,
          },
          result,
        };
      })
      .filter((entry: CollectedPluginResult | undefined): entry is CollectedPluginResult => typeof entry !== "undefined");
    const allIssues: readonly Issue[] = collectedPluginResults.flatMap(
      (entry: CollectedPluginResult): readonly Issue[] => entry.result.issues,
    );
    const combinedMetrics: Record<string, number> = {};
    for (const entry of collectedPluginResults) {
      for (const [key, value] of Object.entries(entry.result.metrics)) {
        combinedMetrics[key] = value;
      }
    }
    return {
      page,
      device,
      url,
      pluginResults,
      allIssues,
      combinedMetrics,
      executionMeta,
      collected: {
        plugins: collectedPluginResults,
      },
      validation: {
        isValid: validationErrors.length === 0,
        errors: validationErrors,
      },
    };
  }

  private validateCompleteness(params: {
    readonly expectedPluginNames: readonly string[];
    readonly pluginResults: Readonly<Record<string, AuditResult>>;
  }): string[] {
    const { expectedPluginNames, pluginResults } = params;
    const errors: string[] = [];
    for (const name of expectedPluginNames) {
      if (!Object.prototype.hasOwnProperty.call(pluginResults, name)) {
        errors.push(`Missing result for plugin: ${name}`);
      }
    }
    for (const [name, result] of Object.entries(pluginResults)) {
      if (!expectedPluginNames.includes(name)) {
        errors.push(`Unexpected plugin result: ${name}`);
      }
      if (typeof result.metadata !== "object" || result.metadata === null) {
        errors.push(`Invalid metadata for plugin: ${name}`);
      }
    }
    return errors;
  }
}
