/**
 * Error Handling Module - Comprehensive error management system
 * 
 * This module provides a complete error handling system with classification,
 * recovery strategies, logging, graceful degradation capabilities, and
 * specialized reporting integration.
 */

// Export error types
export * from './error-types.js';

// Export error recovery system
export * from './error-recovery.js';

// Export main error handler
export * from './error-handler.js';

// Export reporting integration
export * from './report-error-recovery.js';
export * from './reporting-integration.js';

// Convenience exports for common error types
export {
  FileSystemError,
  DirectoryCreationError,
  FileWriteError,
  FileReadError,
  DataProcessingError,
  JSONSerializationError,
  PatternAnalysisError,
  PerformanceError,
  ReportGenerationTimeoutError,
  MemoryExhaustionError,
  IntegrationError,
  WebhookDeliveryError,
  CICDIntegrationError,
  NetworkError,
  ValidationError
} from './error-types.js';

// Convenience exports for recovery system
export {
  ErrorRecoveryManager,
  DefaultErrorLogger
} from './error-recovery.js';

// Main error handler export
export { ErrorHandler } from './error-handler.js';

// Reporting integration exports
export { 
  ReportErrorRecovery
} from './report-error-recovery.js';

export {
  ErrorHandledReportGenerator
} from './reporting-integration.js';