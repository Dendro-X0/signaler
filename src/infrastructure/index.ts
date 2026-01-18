/**
 * Infrastructure Module - Cross-cutting platform and utility services
 * 
 * This module contains platform services, network utilities, security services,
 * error handling, and other cross-cutting concerns that support the core functionality.
 */

export * from './platform/index.js';
export * from './network/index.js';
export * from './security/index.js';
export * from './filesystem/index.js';

// Export error handling with explicit re-exports to avoid conflicts
export {
  ErrorCategory,
  ErrorSeverity,
  RecoveryAction,
  ErrorContext,
  RecoveryStrategy,
  SignalerError,
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
  ValidationError,
  ErrorRecoveryManager,
  DefaultErrorLogger,
  ErrorHandler,
  ReportErrorRecovery,
  ErrorHandledReportGenerator
} from './error-handling/index.js';

// Re-export NetworkError from error-handling with a different name to avoid conflict
export { NetworkError as ErrorHandlingNetworkError } from './error-handling/index.js';