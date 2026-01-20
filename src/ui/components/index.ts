/**
 * UI Components - Reusable interface components
 */

// UI component interfaces
/**
 * Reusable UI component contract for terminal rendering.
 */
export interface UIComponent {
  render(data: unknown): string;
  getRequiredWidth(): number;
}

/**
 * Progress indicator contract for interactive CLI rendering.
 */
export interface ProgressIndicator {
  start(message?: string): void;
  update(message: string): void;
  stop(): void;
  isActive(): boolean;
}

// Re-export UI components
export * from './panel.js';
export * from './table.js';
export * from './progress.js';