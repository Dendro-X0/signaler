/**
 * Configuration CLI - Command-line interface for configuration management
 * 
 * This module provides CLI commands for creating, validating, and managing
 * Signaler configuration files.
 */

import { writeFileSync, existsSync } from 'fs';
import { resolve } from 'path';
import { ConfigurationManager, type SignalerConfig } from '../core/configuration-manager.js';

export interface ConfigCliOptions {
  init?: boolean;
  validate?: boolean;
  format?: 'json' | 'yaml';
  environment?: string;
  output?: string;
  template?: boolean;
}

/**
 * Configuration CLI handler
 */
export class ConfigCli {
  /**
   * Handle configuration CLI commands
   */
  static async handle(options: ConfigCliOptions): Promise<void> {
    if (options.init || options.template) {
      await this.handleInit(options);
    } else if (options.validate) {
      await this.handleValidate(options);
    } else {
      await this.handleShow(options);
    }
  }

  /**
   * Initialize new configuration file
   */
  private static async handleInit(options: ConfigCliOptions): Promise<void> {
    const format = options.format || 'json';
    const outputPath = options.output || `signaler.config.${format}`;
    const fullPath = resolve(outputPath);

    if (existsSync(fullPath) && !options.template) {
      console.error(`Configuration file already exists: ${fullPath}`);
      console.log('Use --template to create a template file anyway');
      process.exit(1);
    }

    try {
      ConfigurationManager.createTemplate(fullPath, format);
      console.log(`✅ Created configuration file: ${fullPath}`);
      console.log('');
      console.log('Next steps:');
      console.log('1. Review and customize the configuration');
      console.log('2. Validate with: signaler config --validate');
      console.log('3. Run audit with: signaler audit');
    } catch (error) {
      console.error('❌ Failed to create configuration file:', error);
      process.exit(1);
    }
  }

  /**
   * Validate existing configuration
   */
  private static async handleValidate(options: ConfigCliOptions): Promise<void> {
    try {
      const configManager = new ConfigurationManager(
        options.output, 
        options.environment || 'default'
      );
      
      const validation = configManager.validateConfiguration();
      
      if (validation.isValid) {
        console.log('✅ Configuration is valid');
        
        if (validation.warnings.length > 0) {
          console.log('');
          console.log('⚠️  Warnings:');
          validation.warnings.forEach(warning => {
            console.log(`   - ${warning}`);
          });
        }
      } else {
        console.log('❌ Configuration validation failed');
        console.log('');
        console.log('Errors:');
        validation.errors.forEach(error => {
          console.log(`   - ${error}`);
        });
        
        if (validation.warnings.length > 0) {
          console.log('');
          console.log('Warnings:');
          validation.warnings.forEach(warning => {
            console.log(`   - ${warning}`);
          });
        }
        
        process.exit(1);
      }
    } catch (error) {
      console.error('❌ Failed to validate configuration:', error);
      process.exit(1);
    }
  }

  /**
   * Show current configuration
   */
  private static async handleShow(options: ConfigCliOptions): Promise<void> {
    try {
      const configManager = new ConfigurationManager(
        options.output,
        options.environment || 'default'
      );
      
      const config = options.environment 
        ? configManager.getEnvironmentConfig(options.environment)
        : configManager.getConfig();
      
      console.log('Current Configuration:');
      console.log('');
      console.log(JSON.stringify(config, null, 2));
      
      if (options.environment) {
        console.log('');
        console.log(`Environment: ${options.environment}`);
      }
    } catch (error) {
      console.error('❌ Failed to load configuration:', error);
      process.exit(1);
    }
  }

  /**
   * Show configuration help
   */
  static showHelp(): void {
    console.log(`
Signaler Configuration Management

USAGE:
  signaler config [OPTIONS]

OPTIONS:
  --init                 Create a new configuration file
  --validate            Validate existing configuration
  --format <format>     Configuration format (json|yaml) [default: json]
  --environment <env>   Environment name for environment-specific config
  --output <path>       Configuration file path
  --template            Create template even if file exists

EXAMPLES:
  signaler config --init                    Create signaler.config.json
  signaler config --init --format yaml     Create signaler.config.yaml
  signaler config --validate               Validate current configuration
  signaler config --environment staging    Show staging environment config
  signaler config --output custom.json     Use custom configuration file

CONFIGURATION SECTIONS:
  audit                 Core audit settings (concurrency, timeout, devices)
  reporting            Report generation settings (formats, output directory)
  csvExport            CSV export configuration
  performanceBudgets   Performance thresholds by page type
  cicd                 CI/CD integration settings (exit codes, webhooks)
  team                 Team settings (reviewers, notifications, custom rules)
  environments         Environment-specific overrides

For more information, visit: https://signaler.dev/docs/configuration
`);
  }
}

/**
 * Parse CLI arguments for configuration commands
 */
export function parseConfigArgs(args: string[]): ConfigCliOptions {
  const options: ConfigCliOptions = {};
  
  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    
    switch (arg) {
      case '--init':
        options.init = true;
        break;
      case '--validate':
        options.validate = true;
        break;
      case '--template':
        options.template = true;
        break;
      case '--format':
        options.format = args[++i] as 'json' | 'yaml';
        break;
      case '--environment':
        options.environment = args[++i];
        break;
      case '--output':
        options.output = args[++i];
        break;
      case '--help':
      case '-h':
        ConfigCli.showHelp();
        process.exit(0);
        break;
    }
  }
  
  return options;
}