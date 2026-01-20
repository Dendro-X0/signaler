/**
 * Configuration Manager - Team-wide settings and environment-specific configurations
 * 
 * This module provides configuration file support with YAML/JSON schemas,
 * team-wide settings consistency, and environment-specific configurations.
 */

import { readFileSync, existsSync, writeFileSync } from 'fs';
import { join, resolve } from 'path';

/**
 * Root configuration for Signaler.
 */
export interface SignalerConfig {
  // Core audit settings
  audit: {
    concurrency: number;
    timeout: number;
    retries: number;
    devices: ('desktop' | 'mobile')[];
    throttling: 'none' | 'slow-3g' | 'fast-3g';
  };

  // Report generation settings
  reporting: {
    outputDirectory: string;
    formats: ('html' | 'json' | 'markdown' | 'csv')[];
    includeScreenshots: boolean;
    maxIssuesPerReport: number;
    tokenOptimization: boolean;
    streamingThreshold: number;
  };

  // CSV export settings
  csvExport: {
    includeMetrics: boolean;
    includeIssues: boolean;
    includeTrends: boolean;
    delimiter: ',' | ';' | '\t';
    includeHeaders: boolean;
  };

  // Performance budgets
  performanceBudgets: {
    [pageType: string]: {
      performance: number;
      accessibility: number;
      bestPractices: number;
      seo: number;
      lcp: number;
      fcp: number;
      tbt: number;
      cls: number;
    };
  };

  // CI/CD integration
  cicd: {
    failOnBudgetViolation: boolean;
    exitCodes: {
      success: number;
      budgetViolation: number;
      criticalIssues: number;
      auditFailure: number;
    };
    webhooks: WebhookConfig[];
  };

  // Team settings
  team: {
    defaultReviewers: string[];
    notificationChannels: string[];
    customRules: CustomRule[];
  };

  // Environment-specific overrides
  environments: {
    [envName: string]: Partial<SignalerConfig>;
  };
}

/**
 * Webhook delivery configuration.
 */
export interface WebhookConfig {
  url: string;
  events: ('audit-complete' | 'budget-violation' | 'critical-issues')[];
  headers?: Record<string, string>;
  retries: number;
  timeout: number;
}

/**
 * Custom rule definition for team policies.
 */
export interface CustomRule {
  id: string;
  name: string;
  description: string;
  severity: 'critical' | 'high' | 'medium' | 'low';
  condition: string; // JavaScript expression
  recommendation: string;
}

/**
 * Configuration Manager for handling team-wide and environment-specific settings
 */
export class ConfigurationManager {
  private config: SignalerConfig;
  private configPath: string;
  private environment: string;

  constructor(configPath?: string, environment: string = 'default') {
    this.environment = environment;
    this.configPath = configPath || this.findConfigFile();
    this.config = this.loadConfiguration();
  }

  /**
   * Get the current configuration
   */
  getConfig(): SignalerConfig {
    return this.config;
  }

  /**
   * Get configuration for a specific section
   */
  getSection<K extends keyof SignalerConfig>(section: K): SignalerConfig[K] {
    return this.config[section];
  }

  /**
   * Update configuration section
   */
  updateSection<K extends keyof SignalerConfig>(
    section: K, 
    updates: Partial<SignalerConfig[K]>
  ): void {
    this.config[section] = { ...this.config[section], ...updates };
  }

  /**
   * Save configuration to file
   */
  saveConfiguration(): void {
    const configData = this.isYamlFile(this.configPath) 
      ? ConfigurationManager.toYaml(this.config)
      : JSON.stringify(this.config, null, 2);
    
    writeFileSync(this.configPath, configData, 'utf8');
  }

  /**
   * Validate configuration against schema
   */
  validateConfiguration(): ValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Validate audit settings
    if (this.config.audit.concurrency < 1 || this.config.audit.concurrency > 10) {
      errors.push('audit.concurrency must be between 1 and 10');
    }

    if (this.config.audit.timeout < 5000 || this.config.audit.timeout > 120000) {
      warnings.push('audit.timeout should be between 5000ms and 120000ms');
    }

    // Validate reporting settings
    if (!this.config.reporting.formats || this.config.reporting.formats.length === 0) {
      errors.push('reporting.formats must include at least one format');
    }

    if (this.config.reporting.streamingThreshold < 10) {
      warnings.push('reporting.streamingThreshold below 10 may not provide performance benefits');
    }

    // Validate performance budgets
    for (const [pageType, budget] of Object.entries(this.config.performanceBudgets)) {
      if (budget.performance < 0 || budget.performance > 100) {
        errors.push(`performanceBudgets.${pageType}.performance must be between 0 and 100`);
      }
    }

    // Validate webhook configurations
    for (const webhook of this.config.cicd.webhooks) {
      if (!webhook.url || !webhook.url.startsWith('http')) {
        errors.push('webhook.url must be a valid HTTP/HTTPS URL');
      }
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings
    };
  }

  /**
   * Get environment-specific configuration
   */
  getEnvironmentConfig(envName: string): SignalerConfig {
    const baseConfig = { ...this.config };
    const envOverrides = this.config.environments[envName];
    
    if (!envOverrides) {
      return baseConfig;
    }

    return this.mergeConfigurations(baseConfig, envOverrides);
  }

  /**
   * Create configuration template for new projects
   */
  static createTemplate(outputPath: string, format: 'json' | 'yaml' = 'json'): void {
    const template = ConfigurationManager.getDefaultConfig();
    
    const content = format === 'yaml' 
      ? ConfigurationManager.toYaml(template)
      : JSON.stringify(template, null, 2);
    
    writeFileSync(outputPath, content, 'utf8');
  }

  /**
   * Get default configuration
   */
  static getDefaultConfig(): SignalerConfig {
    return {
      audit: {
        concurrency: 3,
        timeout: 30000,
        retries: 2,
        devices: ['desktop', 'mobile'],
        throttling: 'slow-3g'
      },
      reporting: {
        outputDirectory: 'signaler',
        formats: ['html', 'json', 'markdown'],
        includeScreenshots: true,
        maxIssuesPerReport: 50,
        tokenOptimization: true,
        streamingThreshold: 20
      },
      csvExport: {
        includeMetrics: true,
        includeIssues: true,
        includeTrends: false,
        delimiter: ',',
        includeHeaders: true
      },
      performanceBudgets: {
        default: {
          performance: 75,
          accessibility: 90,
          bestPractices: 85,
          seo: 90,
          lcp: 2500,
          fcp: 1800,
          tbt: 300,
          cls: 0.1
        },
        homepage: {
          performance: 85,
          accessibility: 95,
          bestPractices: 90,
          seo: 95,
          lcp: 2000,
          fcp: 1500,
          tbt: 200,
          cls: 0.05
        }
      },
      cicd: {
        failOnBudgetViolation: true,
        exitCodes: {
          success: 0,
          budgetViolation: 1,
          criticalIssues: 2,
          auditFailure: 3
        },
        webhooks: []
      },
      team: {
        defaultReviewers: [],
        notificationChannels: [],
        customRules: []
      },
      environments: {
        development: {
          audit: {
            concurrency: 1,
            timeout: 60000,
            retries: 2,
            devices: ['desktop'],
            throttling: 'none'
          },
          reporting: {
            outputDirectory: 'signaler',
            formats: ['json'],
            includeScreenshots: false,
            maxIssuesPerReport: 25,
            tokenOptimization: true,
            streamingThreshold: 10
          }
        },
        staging: {
          performanceBudgets: {
            default: {
              performance: 70,
              accessibility: 85,
              bestPractices: 80,
              seo: 85,
              lcp: 3000,
              fcp: 2000,
              tbt: 400,
              cls: 0.15
            }
          }
        },
        production: {
          cicd: {
            failOnBudgetViolation: true,
            exitCodes: {
              success: 0,
              budgetViolation: 1,
              criticalIssues: 2,
              auditFailure: 3
            },
            webhooks: []
          },
          performanceBudgets: {
            default: {
              performance: 80,
              accessibility: 95,
              bestPractices: 90,
              seo: 95,
              lcp: 2200,
              fcp: 1600,
              tbt: 250,
              cls: 0.08
            }
          }
        }
      }
    };
  }

  /**
   * Load configuration from file
   */
  private loadConfiguration(): SignalerConfig {
    if (!existsSync(this.configPath)) {
      return ConfigurationManager.getDefaultConfig();
    }

    try {
      const content = readFileSync(this.configPath, 'utf8');
      
      let config: SignalerConfig;
      if (this.isYamlFile(this.configPath)) {
        config = this.parseYaml(content);
      } else {
        config = JSON.parse(content);
      }

      // Merge with defaults to ensure all properties exist
      return this.mergeConfigurations(ConfigurationManager.getDefaultConfig(), config);
    } catch (error) {
      console.warn(`Failed to load configuration from ${this.configPath}:`, error);
      return ConfigurationManager.getDefaultConfig();
    }
  }

  /**
   * Find configuration file in common locations
   */
  private findConfigFile(): string {
    const possiblePaths = [
      'signaler.config.json',
      'signaler.config.yaml',
      'signaler.config.yml',
      '.signaler.json',
      '.signaler.yaml',
      '.signaler.yml',
      'package.json' // Check for signaler config in package.json
    ];

    for (const path of possiblePaths) {
      const fullPath = resolve(path);
      if (existsSync(fullPath)) {
        if (path === 'package.json') {
          // Check if package.json has signaler config
          try {
            const pkg = JSON.parse(readFileSync(fullPath, 'utf8'));
            if (pkg.signaler) {
              return fullPath;
            }
          } catch {
            // Continue searching
          }
        } else {
          return fullPath;
        }
      }
    }

    // Default to signaler.config.json if no config found
    return resolve('signaler.config.json');
  }

  /**
   * Check if file is YAML format
   */
  private isYamlFile(path: string): boolean {
    return path.endsWith('.yaml') || path.endsWith('.yml');
  }

  /**
   * Parse YAML content (basic implementation)
   */
  private parseYaml(content: string): any {
    // Basic YAML parsing - in production, use a proper YAML library
    // This is a simplified implementation for the core functionality
    try {
      // For now, assume JSON-like structure in YAML
      // In a real implementation, you'd use js-yaml or similar
      return JSON.parse(content);
    } catch {
      throw new Error('YAML parsing not fully implemented - use JSON format');
    }
  }

  /**
   * Convert object to YAML (basic implementation)
   */
  private static toYaml(obj: any): string {
    // Basic YAML serialization - in production, use a proper YAML library
    // This is a simplified implementation for the core functionality
    return JSON.stringify(obj, null, 2);
  }

  /**
   * Deep merge two configuration objects
   */
  private mergeConfigurations(base: any, override: any): any {
    const result = { ...base };

    for (const key in override) {
      if (override[key] && typeof override[key] === 'object' && !Array.isArray(override[key])) {
        result[key] = this.mergeConfigurations(result[key] || {}, override[key]);
      } else {
        result[key] = override[key];
      }
    }

    return result;
  }
}

/**
 * Configuration validation result
 */
export interface ValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
}

/**
 * Configuration schema for validation
 */
export const ConfigurationSchema = {
  type: 'object',
  properties: {
    audit: {
      type: 'object',
      properties: {
        concurrency: { type: 'number', minimum: 1, maximum: 10 },
        timeout: { type: 'number', minimum: 5000, maximum: 120000 },
        retries: { type: 'number', minimum: 0, maximum: 5 },
        devices: { 
          type: 'array', 
          items: { enum: ['desktop', 'mobile'] },
          minItems: 1
        },
        throttling: { enum: ['none', 'slow-3g', 'fast-3g'] }
      },
      required: ['concurrency', 'timeout', 'retries', 'devices']
    },
    reporting: {
      type: 'object',
      properties: {
        outputDirectory: { type: 'string', minLength: 1 },
        formats: {
          type: 'array',
          items: { enum: ['html', 'json', 'markdown', 'csv'] },
          minItems: 1
        },
        includeScreenshots: { type: 'boolean' },
        maxIssuesPerReport: { type: 'number', minimum: 1 },
        tokenOptimization: { type: 'boolean' },
        streamingThreshold: { type: 'number', minimum: 1 }
      },
      required: ['outputDirectory', 'formats']
    },
    performanceBudgets: {
      type: 'object',
      patternProperties: {
        '.*': {
          type: 'object',
          properties: {
            performance: { type: 'number', minimum: 0, maximum: 100 },
            accessibility: { type: 'number', minimum: 0, maximum: 100 },
            bestPractices: { type: 'number', minimum: 0, maximum: 100 },
            seo: { type: 'number', minimum: 0, maximum: 100 },
            lcp: { type: 'number', minimum: 0 },
            fcp: { type: 'number', minimum: 0 },
            tbt: { type: 'number', minimum: 0 },
            cls: { type: 'number', minimum: 0 }
          }
        }
      }
    }
  },
  required: ['audit', 'reporting', 'performanceBudgets']
};