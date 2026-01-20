/**
 * Signaler - Main Entry Point
 * 
 * This is the main entry point for the Signaler application.
 * It provides access to all modules through a clean, modular API.
 */

// Core functionality
export * from './core/index.js';

// CLI interface
export * from './cli/index.js';

// Audit runners
export * from './runners/index.js';

// Reporting system
export * from './reporting/index.js';

// Infrastructure services
export * from './infrastructure/index.js';

// UI components
export * from './ui/index.js';

// Main application interface
/**
 * Public application interface for invoking Signaler programmatically.
 */
export interface SignalerApp {
  /**
   * The version of the Signaler application.
   */
  version: string;
  /**
   * Runs the Signaler application with the given arguments.
   * @param args The arguments to pass to the application.
   * @returns A promise that resolves when the application has finished running.
   */
  run(args: string[]): Promise<void>;
}

// Main application runner
export { runBin } from './bin.js';