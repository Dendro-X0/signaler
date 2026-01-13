/**
 * Data Formatters - Data formatting utilities
 */

// Formatter interfaces
export interface DataFormatter<T, R> {
  format(data: T): R;
  validate(data: T): boolean;
}

// Re-export formatters (will be added during migration)
// export * from './summary.js';
// export * from './issues.js';