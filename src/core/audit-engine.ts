/**
 * Core Audit Engine - Central audit orchestration
 * 
 * This module provides the main audit engine that coordinates
 * different audit runners and manages the overall audit process.
 */

export interface AuditRunner {
  name: string;
  version: string;
  run(config: RunnerConfig): Promise<RunnerResult>;
  validate(config: RunnerConfig): boolean;
}

export interface RunnerConfig {
  name: string;
  url?: string;
  page?: PageConfig;
  [key: string]: unknown;
}

export interface RunnerResult {
  success: boolean;
  error?: string;
  [key: string]: unknown;
}

export interface RunnerRegistry {
  register(runner: AuditRunner): void;
  get(name: string): AuditRunner | undefined;
  list(): AuditRunner[];
}

export interface AuditEngine {
  runAudit(config: AuditConfig): Promise<AuditResult>;
  getAvailableRunners(): RunnerInfo[];
  validateConfig(config: unknown): AuditConfig;
}

export interface AuditConfig {
  baseUrl: string;
  pages: PageConfig[];
  runners: RunnerConfig[];
  output: OutputConfig;
  parallel?: number;
  timeout?: number;
}

export interface PageConfig {
  path: string;
  label: string;
  devices: ('mobile' | 'desktop')[];
  scope?: 'public' | 'requires-auth';
}

export interface OutputConfig {
  directory: string;
  formats: ('html' | 'json' | 'markdown')[];
  artifacts: boolean;
}

export interface AuditResult {
  meta: AuditMetadata;
  results: PageResult[];
}

export interface AuditMetadata {
  configPath: string;
  startedAt: string;
  completedAt: string;
  elapsedMs: number;
  totalPages: number;
  totalRunners: number;
}

export interface PageResult {
  page: PageConfig;
  runnerResults: Record<string, RunnerResult>;
}

export interface RunnerInfo {
  name: string;
  version: string;
  description: string;
  supportedConfigs: string[];
}

/**
 * Default implementation of the audit engine
 */
export class DefaultAuditEngine implements AuditEngine {
  private runnerRegistry: RunnerRegistry;

  constructor(runnerRegistry: RunnerRegistry) {
    this.runnerRegistry = runnerRegistry;
  }

  async runAudit(config: AuditConfig): Promise<AuditResult> {
    const startTime = Date.now();
    const results: PageResult[] = [];

    // Validate configuration
    const validatedConfig = this.validateConfig(config);

    // Run audits for each page
    for (const page of validatedConfig.pages) {
      const runnerResults: Record<string, RunnerResult> = {};

      // Run each configured runner for this page
      for (const runnerConfig of validatedConfig.runners) {
        const runner = this.runnerRegistry.get(runnerConfig.name);
        if (!runner) {
          throw new Error(`Runner not found: ${runnerConfig.name}`);
        }

        try {
          const result = await runner.run({
            ...runnerConfig,
            url: `${validatedConfig.baseUrl}${page.path}`,
            page,
          });
          runnerResults[runner.name] = result;
        } catch (error) {
          runnerResults[runner.name] = {
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error',
          };
        }
      }

      results.push({
        page,
        runnerResults,
      });
    }

    const endTime = Date.now();

    return {
      meta: {
        configPath: '', // Will be set by caller
        startedAt: new Date(startTime).toISOString(),
        completedAt: new Date(endTime).toISOString(),
        elapsedMs: endTime - startTime,
        totalPages: validatedConfig.pages.length,
        totalRunners: validatedConfig.runners.length,
      },
      results,
    };
  }

  getAvailableRunners(): RunnerInfo[] {
    return this.runnerRegistry.list().map(runner => ({
      name: runner.name,
      version: runner.version,
      description: `${runner.name} audit runner`,
      supportedConfigs: [], // TODO: Extract from runner
    }));
  }

  validateConfig(config: unknown): AuditConfig {
    if (!config || typeof config !== 'object') {
      throw new Error('Invalid audit configuration: must be an object');
    }

    const cfg = config as Record<string, unknown>;

    if (typeof cfg.baseUrl !== 'string') {
      throw new Error('Invalid audit configuration: baseUrl must be a string');
    }

    if (!Array.isArray(cfg.pages)) {
      throw new Error('Invalid audit configuration: pages must be an array');
    }

    if (!Array.isArray(cfg.runners)) {
      throw new Error('Invalid audit configuration: runners must be an array');
    }

    if (!cfg.output || typeof cfg.output !== 'object') {
      throw new Error('Invalid audit configuration: output must be an object');
    }

    // Basic validation - create a properly typed config
    return {
      baseUrl: cfg.baseUrl,
      pages: cfg.pages as PageConfig[], // TODO: Add proper validation
      runners: cfg.runners as RunnerConfig[], // TODO: Add proper validation
      output: cfg.output as OutputConfig, // TODO: Add proper validation
      parallel: typeof cfg.parallel === 'number' ? cfg.parallel : undefined,
      timeout: typeof cfg.timeout === 'number' ? cfg.timeout : undefined,
    };
  }
}

/**
 * Default runner registry implementation
 */
export class DefaultRunnerRegistry implements RunnerRegistry {
  private runners = new Map<string, AuditRunner>();

  register(runner: AuditRunner): void {
    this.runners.set(runner.name, runner);
  }

  get(name: string): AuditRunner | undefined {
    return this.runners.get(name);
  }

  list(): AuditRunner[] {
    return Array.from(this.runners.values());
  }
}