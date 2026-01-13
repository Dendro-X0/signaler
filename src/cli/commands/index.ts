/**
 * CLI Commands - Individual command implementations
 */

// Command interfaces and registry
export interface CLICommand {
  name: string;
  description: string;
  execute(args: string[]): Promise<void>;
}

export interface CommandRegistry {
  register(command: CLICommand): void;
  execute(commandName: string, args: string[]): Promise<void>;
  list(): CLICommand[];
}

// Re-export individual commands (will be added during migration)
// export * from './audit.js';
// export * from './measure.js';
// export * from './bundle.js';