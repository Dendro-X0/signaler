/**
 * Argument Parsing - CLI argument parsing and validation
 */

// Argument parsing interfaces
export interface ArgumentParser {
  parse(args: string[]): ParsedArguments;
  validate(args: ParsedArguments): boolean;
}

export interface ParsedArguments {
  command: string;
  flags: Record<string, unknown>;
  positional: string[];
}

// Re-export argument parsing components (will be added during migration)
// export * from './parser.js';
// export * from './validation.js';