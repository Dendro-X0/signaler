/**
 * Interactive Shell - Shell functionality and command handling
 */

// Shell interfaces
export interface InteractiveShell {
  start(): Promise<void>;
  executeCommand(command: string, args: string[]): Promise<void>;
  stop(): void;
}

// Re-export shell components (will be added during migration)
// export * from './shell.js';
// export * from './commands.js';