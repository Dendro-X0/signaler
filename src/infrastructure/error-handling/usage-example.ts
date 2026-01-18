/**
 * Usage Example - Demonstrates how to use the error handling system
 * 
 * This module provides examples of how to integrate the error handling
 * system with existing Signaler components.
 */

import { 
  ErrorHandler, 
  ErrorHandledReportGenerator,
  ReportErrorRecovery,
  FileSystemError,
  DataProcessingError
} from './index.js';
import { ReportGeneratorEngine } from '../../reporting/generators/report-generator-engine.js';
import type { ProcessedAuditData } from '../../reporting/generators/report-generator-engine.js';

/**
 * Example: Basic error handling usage
 */
export async function basicErrorHandlingExample(): Promise<void> {
  const errorHandler = new ErrorHandler({
    enableConsoleLogging: true,
    enableFileLogging: true,
    logFilePath: './signaler-errors.log',
    maxRetryAttempts: 3,
    memoryThresholdMB: 1024,
    timeoutMs: 10000
  });

  try {
    // Execute operation with error handling
    const result = await errorHandler.executeWithErrorHandling(
      async () => {
        // Simulate an operation that might fail
        throw new Error('Simulated failure');
      },
      'example_operation',
      'example_component',
      { exampleMetadata: 'test' }
    );

    console.log('Operation completed:', result);
  } catch (error) {
    console.error('Operation failed after all recovery attempts:', error);
  }
}

/**
 * Example: Report generation with error handling
 */
export async function reportGenerationWithErrorHandlingExample(
  auditData: ProcessedAuditData,
  outputDirectory: string
): Promise<void> {
  // Create base report generator
  const baseReportGenerator = new ReportGeneratorEngine({
    outputFormats: ['html', 'json', 'markdown'],
    includeScreenshots: true,
    maxIssuesPerReport: 100,
    tokenOptimization: true,
    streamingThreshold: 50,
    enableProgressIndicators: false,
    optimizeFileIO: true,
    compressionEnabled: false,
    maxMemoryMB: 256
  });

  // Wrap with error handling
  const errorHandledGenerator = new ErrorHandledReportGenerator(baseReportGenerator, {
    enableConsoleLogging: true,
    enableFileLogging: true,
    fallbackToMinimal: true,
    enablePartialReports: true,
    enableStreamingFallback: true,
    streamingChunkSize: 10,
    minimalReportConfig: {
      includeBasicMetrics: true,
      includeTopIssues: true,
      maxIssuesCount: 5,
      outputFormat: 'markdown'
    }
  });

  try {
    // Generate reports with comprehensive error handling
    const result = await errorHandledGenerator.generateReportsWithErrorHandling(
      auditData,
      outputDirectory,
      ['html', 'json', 'markdown', 'csv']
    );

    if (result.success) {
      console.log(`✅ Reports generated successfully in ${result.generationTimeMs}ms`);
      console.log(`Generated files: ${result.generatedFiles.length}`);
      
      if (result.fallbackUsed) {
        console.log(`⚠️  Fallback used: ${result.fallbackUsed}`);
      }
      
      if (result.warnings.length > 0) {
        console.log('Warnings:', result.warnings);
      }
    } else {
      console.error('❌ Report generation failed');
      console.error('Errors:', result.errors);
    }
  } catch (error) {
    console.error('Fatal error in report generation:', error);
  }
}

/**
 * Example: Manual error recovery
 */
export async function manualErrorRecoveryExample(
  auditData: ProcessedAuditData,
  outputDirectory: string
): Promise<void> {
  const errorHandler = new ErrorHandler();
  const reportRecovery = new ReportErrorRecovery(errorHandler);

  try {
    // Simulate a report generation failure
    throw new FileSystemError(
      'Cannot write to output directory',
      'write_report',
      outputDirectory
    );
  } catch (error) {
    if (error instanceof FileSystemError) {
      console.log('🔄 Attempting error recovery...');
      
      const context = {
        outputDirectory,
        requestedFormats: ['html', 'json'] as any[],
        originalData: auditData,
        config: {
          outputFormats: ['html', 'json'] as any[],
          includeScreenshots: false,
          maxIssuesPerReport: 50,
          tokenOptimization: true,
          streamingThreshold: 25,
          enableProgressIndicators: false,
          optimizeFileIO: true,
          compressionEnabled: false,
          maxMemoryMB: 256
        }
      };

      // Generate minimal reports as fallback
      const recoveryResult = await reportRecovery.generateMinimalReports(context, error);
      
      if (recoveryResult.success) {
        console.log(`✅ Recovery successful: ${recoveryResult.fallbackUsed}`);
        console.log(`Generated files: ${recoveryResult.generatedFiles.join(', ')}`);
      } else {
        console.error('❌ Recovery failed:', recoveryResult.errors);
      }
    }
  }
}

/**
 * Example: Custom error handling for specific operations
 */
export async function customErrorHandlingExample(): Promise<void> {
  const errorHandler = new ErrorHandler({
    enableConsoleLogging: true,
    maxRetryAttempts: 5, // More retries for critical operations
    memoryThresholdMB: 512, // Lower threshold for constrained environments
    timeoutMs: 30000 // Longer timeout for complex operations
  });

  // Example: File processing with custom error handling
  const processFiles = async (filePaths: string[]): Promise<string[]> => {
    const results: string[] = [];
    
    for (const filePath of filePaths) {
      try {
        const result = await errorHandler.executeWithErrorHandling(
          async () => {
            // Simulate file processing
            const { readFile } = await import('node:fs/promises');
            const content = await readFile(filePath, 'utf8');
            return `Processed: ${content.length} characters`;
          },
          'process_file',
          'file_processor',
          { filePath }
        );
        
        results.push(result);
      } catch (error) {
        console.warn(`⚠️  Skipping file ${filePath}: ${error instanceof Error ? error.message : String(error)}`);
        // Continue processing other files
      }
    }
    
    return results;
  };

  // Process files with error handling
  const filePaths = ['./file1.txt', './file2.txt', './nonexistent.txt'];
  const results = await processFiles(filePaths);
  
  console.log(`Processed ${results.length} files successfully`);
}

/**
 * Example: Memory-constrained environment handling
 */
export async function memoryConstrainedExample(
  auditData: ProcessedAuditData,
  outputDirectory: string
): Promise<void> {
  const errorHandler = new ErrorHandler({
    memoryThresholdMB: 256, // Very low threshold
    enableConsoleLogging: true
  });

  const reportRecovery = new ReportErrorRecovery(errorHandler, {
    includeBasicMetrics: true,
    includeTopIssues: false, // Reduce memory usage
    maxIssuesCount: 3,
    outputFormat: 'text' // Minimal format
  });

  const context = {
    outputDirectory,
    requestedFormats: ['json'] as any[],
    originalData: auditData,
    config: {
      outputFormats: ['json'] as any[],
      includeScreenshots: false,
      maxIssuesPerReport: 10,
      tokenOptimization: true,
      streamingThreshold: 5, // Very low threshold for streaming
      enableProgressIndicators: false,
      optimizeFileIO: true,
      compressionEnabled: false,
      maxMemoryMB: 256
    }
  };

  try {
    // Generate memory-efficient reports
    const result = await reportRecovery.generateMemoryEfficientReports(context);
    
    if (result.success) {
      console.log('✅ Memory-efficient reports generated');
      console.log(`Files: ${result.generatedFiles.join(', ')}`);
    } else {
      console.error('❌ Even memory-efficient generation failed:', result.errors);
    }
  } catch (error) {
    console.error('Fatal memory error:', error);
  }
}

/**
 * Example: Integration with existing Signaler CLI
 */
export async function cliIntegrationExample(): Promise<void> {
  // This would be integrated into the main CLI command
  const errorHandler = new ErrorHandler({
    enableConsoleLogging: true,
    enableFileLogging: true,
    logFilePath: './.signaler/error.log'
  });

  // Example CLI operation with error handling
  const runAuditWithErrorHandling = async (configPath: string): Promise<void> => {
    try {
      await errorHandler.executeWithErrorHandling(
        async () => {
          // Simulate audit execution
          console.log(`Running audit with config: ${configPath}`);
          
          // This would be the actual audit logic
          // const auditResult = await runLighthouseAudit(config);
          // const processedData = await processAuditResults(auditResult);
          // await generateReports(processedData);
          
          return 'Audit completed successfully';
        },
        'run_audit',
        'cli',
        { configPath }
      );
    } catch (error) {
      console.error('❌ Audit failed:', error instanceof Error ? error.message : String(error));
      process.exit(1);
    }
  };

  await runAuditWithErrorHandling('./signaler.config.json');
}

/**
 * Example: Webhook delivery with retry logic
 */
export async function webhookDeliveryExample(): Promise<void> {
  const errorHandler = new ErrorHandler({
    maxRetryAttempts: 5, // More retries for network operations
    enableConsoleLogging: true
  });

  const deliverWebhook = async (url: string, payload: any): Promise<void> => {
    await errorHandler.executeWithErrorHandling(
      async () => {
        // Simulate webhook delivery
        const response = await fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });

        if (!response.ok) {
          throw new Error(`Webhook delivery failed: ${response.status} ${response.statusText}`);
        }

        return 'Webhook delivered successfully';
      },
      'deliver_webhook',
      'integration',
      { url, payloadSize: JSON.stringify(payload).length }
    );
  };

  try {
    await deliverWebhook('https://example.com/webhook', { 
      event: 'audit_completed',
      timestamp: new Date().toISOString()
    });
    console.log('✅ Webhook delivered');
  } catch (error) {
    console.error('❌ Webhook delivery failed after all retries:', error);
  }
}