# Signaler Error Handling System

## Overview

This comprehensive error handling system provides graceful degradation, recovery strategies, and detailed logging for Signaler's reporting operations. The system is designed to handle various error scenarios while maintaining system stability and providing useful feedback to users.

## Key Components

### 1. Error Types (`error-types.ts`)
- **SignalerError**: Base error class with categorization and recovery strategies
- **Specialized Error Types**: FileSystemError, DataProcessingError, PerformanceError, etc.
- **Error Classification**: Automatic categorization by severity and type
- **Recovery Strategies**: Built-in recovery actions for each error type

### 2. Error Recovery (`error-recovery.ts`)
- **ErrorRecoveryManager**: Orchestrates recovery strategies
- **Recovery Actions**: Retry, fallback, skip, graceful degradation, fail with context
- **Fallback Mechanisms**: Minimal reports, partial generation, streaming processing
- **Logging**: Comprehensive error and recovery logging

### 3. Error Handler (`error-handler.ts`)
- **ErrorHandler**: Main error handling orchestrator
- **Automatic Classification**: Converts unknown errors to SignalerError types
- **Retry Logic**: Intelligent retry with exponential backoff
- **Memory Monitoring**: Checks system resources before operations
- **Timeout Handling**: Prevents operations from hanging indefinitely

### 4. Report Error Recovery (`report-error-recovery.ts`)
- **ReportErrorRecovery**: Specialized recovery for report generation
- **Minimal Reports**: Essential information when full reports fail
- **Partial Reports**: Generate available components when some fail
- **Memory-Efficient Processing**: Reduced data sets for constrained environments
- **Streaming Reports**: Chunk-based processing for large datasets

### 5. Reporting Integration (`reporting-integration.ts`)
- **ErrorHandledReportGenerator**: Enhanced report generator with error handling
- **Comprehensive Recovery**: Multiple fallback strategies for report generation
- **Performance Monitoring**: Tracks generation time and resource usage
- **Integration Ready**: Drop-in replacement for existing report generators

## Error Categories

1. **File System Errors**: Directory creation, file read/write, permissions
2. **Data Processing Errors**: JSON serialization, pattern analysis, validation
3. **Performance Errors**: Timeouts, memory exhaustion, resource limits
4. **Integration Errors**: Webhooks, CI/CD platforms, external services
5. **Network Errors**: Connectivity issues, DNS failures, timeouts
6. **Validation Errors**: Configuration validation, input format errors

## Recovery Strategies

### 1. Retry with Backoff
- Automatic retry for transient errors
- Exponential backoff with jitter
- Configurable retry limits
- Smart error classification

### 2. Fallback to Minimal
- Generate essential reports only
- Reduced functionality but stable operation
- Preserve critical information
- Clear user communication

### 3. Skip and Continue
- Skip failed operations
- Continue with remaining tasks
- Log skipped operations
- Maintain overall process flow

### 4. Graceful Degradation
- Reduce functionality based on constraints
- Memory-efficient processing
- Streaming for large datasets
- Maintain core functionality

### 5. Fail with Context
- Detailed error information
- Suggested solutions
- Clear user guidance
- Debugging context

## Usage Examples

### Basic Error Handling
```typescript
import { ErrorHandler } from './infrastructure/error-handling';

const errorHandler = new ErrorHandler({
  enableConsoleLogging: true,
  maxRetryAttempts: 3,
  memoryThresholdMB: 1024
});

const result = await errorHandler.executeWithErrorHandling(
  async () => {
    // Your operation here
    return await someOperation();
  },
  'operation_name',
  'component_name'
);
```

### Report Generation with Error Handling
```typescript
import { ErrorHandledReportGenerator } from './infrastructure/error-handling';

const generator = new ErrorHandledReportGenerator(baseGenerator, {
  fallbackToMinimal: true,
  enablePartialReports: true,
  enableStreamingFallback: true
});

const result = await generator.generateReportsWithErrorHandling(
  auditData,
  outputDirectory,
  ['html', 'json', 'markdown']
);
```

### Manual Error Recovery
```typescript
import { ReportErrorRecovery } from './infrastructure/error-handling';

const recovery = new ReportErrorRecovery(errorHandler);

const result = await recovery.generateMinimalReports(
  context,
  originalError
);
```

## Configuration Options

### ErrorHandlerConfig
- `enableConsoleLogging`: Console output for errors and recovery
- `enableFileLogging`: Log to file for debugging
- `logFilePath`: Path for error log file
- `maxRetryAttempts`: Maximum retry attempts for transient errors
- `memoryThresholdMB`: Memory threshold for operations
- `timeoutMs`: Operation timeout in milliseconds

### ReportingErrorHandlerConfig
- `fallbackToMinimal`: Enable minimal report fallback
- `enablePartialReports`: Allow partial report generation
- `enableStreamingFallback`: Use streaming for large datasets
- `streamingChunkSize`: Number of pages per chunk
- `minimalReportConfig`: Configuration for minimal reports

## Integration Points

### 1. CLI Integration
- Wrap main audit operations with error handling
- Provide clear error messages to users
- Enable graceful degradation for CI/CD environments

### 2. Report Generator Integration
- Replace existing report generators with error-handled versions
- Maintain backward compatibility
- Add comprehensive logging and monitoring

### 3. Webhook Integration
- Retry failed webhook deliveries
- Fallback to local logging
- Handle network connectivity issues

### 4. CI/CD Integration
- Appropriate exit codes for build systems
- Partial results when possible
- Clear error reporting for debugging

## Benefits

1. **Reliability**: System continues operating despite errors
2. **User Experience**: Clear error messages and suggested solutions
3. **Debugging**: Comprehensive logging and error context
4. **Performance**: Memory-efficient fallbacks for constrained environments
5. **Flexibility**: Multiple recovery strategies for different scenarios
6. **Maintainability**: Centralized error handling logic

## Future Enhancements

1. **Metrics Collection**: Error rate monitoring and alerting
2. **Machine Learning**: Predictive error prevention
3. **User Feedback**: Error reporting and improvement suggestions
4. **Performance Optimization**: Dynamic resource allocation
5. **Integration Expansion**: Additional CI/CD platforms and tools

## Testing

The error handling system includes comprehensive tests and examples:
- Unit tests for individual components
- Integration tests for end-to-end scenarios
- Performance tests for resource constraints
- Recovery tests for various error conditions

Run tests with:
```bash
npm test -- --grep "error-handling"
```

## Monitoring and Debugging

### Log Files
- Error logs: `.signaler/error.log`
- Recovery logs: `.signaler/recovery.log`
- Performance logs: `.signaler/performance.log`

### Console Output
- Color-coded error messages
- Recovery status indicators
- Performance warnings
- Memory usage alerts

### Debug Mode
Enable detailed debugging with:
```typescript
const errorHandler = new ErrorHandler({
  enableConsoleLogging: true,
  enableFileLogging: true,
  logLevel: 'debug'
});
```

This error handling system ensures Signaler remains stable and provides useful feedback even when encountering unexpected errors or resource constraints.