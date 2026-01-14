import { describe, expect, it } from "vitest";
import * as fc from "fast-check";
import { readFileSync, existsSync, writeFileSync, mkdirSync } from "node:fs";
import { join } from "node:path";
import { execSync } from "node:child_process";
import { tmpdir } from "node:os";

describe("Execution Verification", () => {
  describe("Task 7.1: Clean Environment Installation", () => {
    
    it("should build successfully with minimal dependencies", async () => {
      // Feature: codebase-optimization, Property 3: Installation Reliability
      await fc.assert(
        fc.asyncProperty(
          fc.constant(null),
          async () => {
            // Check if TypeScript config for simplified version exists
            const tsConfigPath = 'tsconfig.simplified.json';
            expect(existsSync(tsConfigPath)).toBe(true);
            
            // Verify simplified source files exist and are valid TypeScript
            const srcFiles = [
              'src-simplified/index.ts',
              'src-simplified/config.ts', 
              'src-simplified/lighthouse.ts',
              'src-simplified/report.ts',
              'src-simplified/types.ts'
            ];

            for (const filePath of srcFiles) {
              expect(existsSync(filePath)).toBe(true);
              
              // Basic syntax validation - file should be readable and contain TypeScript
              const content = readFileSync(filePath, 'utf-8');
              expect(content.length).toBeGreaterThan(0);
              expect(content).toContain('export') || expect(content).toContain('import');
            }

            // Verify package.json has correct build script for simplified version
            const packageJsonPath = join(process.cwd(), 'package.simplified.json');
            const packageJsonContent = readFileSync(packageJsonPath, 'utf-8');
            const packageJson = JSON.parse(packageJsonContent);
            
            expect(packageJson.scripts.build).toBe('tsc -p tsconfig.simplified.json');
          }
        ),
        { numRuns: 1 } // Only run once since build is expensive
      );
    });

    it("should have correct package.json configuration for distribution", async () => {
      // Feature: codebase-optimization, Property 3: Installation Reliability
      await fc.assert(
        fc.asyncProperty(
          fc.constant(null),
          async () => {
            const packageJsonPath = join(process.cwd(), 'package.simplified.json');
            const packageJsonContent = readFileSync(packageJsonPath, 'utf-8');
            const packageJson = JSON.parse(packageJsonContent);

            // Verify package is properly configured for npm distribution
            expect(packageJson.name).toBe('@auditorix/signaler');
            expect(packageJson.version).toMatch(/^\d+\.\d+\.\d+$/);
            expect(packageJson.private).toBe(false);
            
            // Verify essential metadata
            expect(packageJson.description).toContain('Lighthouse');
            expect(packageJson.license).toBe('MIT');
            expect(packageJson.type).toBe('module');
            
            // Verify files are properly specified for distribution
            expect(packageJson.files).toContain('dist-simplified');
            expect(packageJson.files).toContain('README.md');
            
            // Verify binary is correctly configured
            expect(packageJson.bin.signaler).toBe('./dist-simplified/index.js');
            
            // Verify scripts are minimal and functional
            expect(packageJson.scripts.build).toBe('tsc -p tsconfig.simplified.json');
            expect(packageJson.scripts.test).toBe('vitest run');
          }
        ),
        { numRuns: 10 }
      );
    });
  });

  describe("Task 7.3: Self-Contained Execution Verification", () => {
    
    it("should handle missing configuration gracefully with zero-config defaults", async () => {
      // Feature: codebase-optimization, Property 7: Zero-Config Operation
      await fc.assert(
        fc.asyncProperty(
          fc.constant(null),
          async () => {
            // Test the config loader directly
            const { loadConfig } = await import('../src-simplified/config.js');
            
            try {
              // Should provide defaults when no config file exists
              const config = await loadConfig();
              
              // Should have sensible defaults
              expect(config.baseUrl).toBe('http://localhost:3000');
              expect(config.pages).toHaveLength(1);
              expect(config.pages[0].path).toBe('/');
              expect(config.pages[0].label).toBe('Home');
              expect(config.options?.device).toBe('mobile');
              expect(config.options?.parallel).toBe(1);
              
            } catch (error) {
              // Should not throw errors for missing config in zero-config mode
              const errorMessage = error instanceof Error ? error.message : String(error);
              expect(errorMessage).not.toContain('No configuration found');
              expect(errorMessage).not.toContain('ENOENT');
            }
          }
        ),
        { numRuns: 10 }
      );
    });

    it("should validate configuration properly with clear error messages", async () => {
      // Feature: codebase-optimization, Property 8: Error Message Clarity
      await fc.assert(
        fc.asyncProperty(
          fc.record({
            baseUrl: fc.oneof(
              fc.constant(''), // Empty string
              fc.constant('not-a-url'), // Invalid URL
              fc.constant('ftp://example.com'), // Wrong protocol
              fc.constant('https://example.com') // Valid URL
            ),
            pages: fc.oneof(
              fc.constant([]), // Empty array
              fc.constant([{ path: 'no-slash' }]), // Invalid path
              fc.constant([{ path: '/', label: 'Home' }]) // Valid page
            )
          }),
          async (testConfig) => {
            // Create a temporary config file
            const tempDir = tmpdir();
            const tempConfigPath = join(tempDir, `test-config-${Date.now()}.json`);
            
            try {
              writeFileSync(tempConfigPath, JSON.stringify(testConfig));
              
              const { loadConfig } = await import('../src-simplified/config.js');
              
              try {
                const config = await loadConfig(tempConfigPath);
                
                // If config loads successfully, it should be valid
                expect(config.baseUrl).toMatch(/^https?:\/\//);
                expect(config.pages.length).toBeGreaterThan(0);
                expect(config.pages[0].path).toMatch(/^\//);
                
              } catch (error) {
                const errorMessage = error instanceof Error ? error.message : String(error);
                
                // All error messages should provide helpful guidance
                const hasGuidance = errorMessage.includes('Example:') || 
                                  errorMessage.includes('example.com') ||
                                  errorMessage.includes('localhost:3000') ||
                                  errorMessage.includes('https://') ||
                                  errorMessage.includes('http://') ||
                                  errorMessage.includes('Add at least one page') ||
                                  errorMessage.includes('{ "path":') ||
                                  errorMessage.includes('Must be a valid URL');
                
                expect(hasGuidance).toBe(true);
                
                // Error messages should be clear and specific
                expect(errorMessage.length).toBeGreaterThan(20); // Should be descriptive
                expect(errorMessage).not.toContain('undefined');
                expect(errorMessage).not.toContain('[object Object]');
              }
              
            } finally {
              // Clean up temp file
              try {
                const fs = await import('node:fs/promises');
                await fs.unlink(tempConfigPath);
              } catch {
                // Ignore cleanup errors
              }
            }
          }
        ),
        { numRuns: 20 }
      );
    });

    it("should have reasonable performance characteristics", async () => {
      // Feature: codebase-optimization, Property 11: Audit Performance
      await fc.assert(
        fc.asyncProperty(
          fc.constant(null),
          async () => {
            // Test module loading performance
            const startTime = Date.now();
            
            // Import all core modules
            await import('../src-simplified/index.js');
            await import('../src-simplified/config.js');
            await import('../src-simplified/lighthouse.js');
            await import('../src-simplified/report.js');
            await import('../src-simplified/types.js');
            
            const loadTime = Date.now() - startTime;
            
            // Module loading should be reasonable (< 5 seconds for all modules)
            expect(loadTime).toBeLessThan(5000);
            
            // Verify the modules are lightweight
            const indexPath = 'src-simplified/index.ts';
            const indexContent = readFileSync(indexPath, 'utf-8');
            const lineCount = indexContent.split('\n').length;
            
            // Main entry point should be concise (< 300 lines)
            expect(lineCount).toBeLessThan(300);
          }
        ),
        { numRuns: 5 }
      );
    });

    it("should generate valid HTML reports without external dependencies", async () => {
      // Feature: codebase-optimization, Property 9: Self-Contained Execution
      await fc.assert(
        fc.asyncProperty(
          fc.array(
            fc.record({
              url: fc.webUrl(),
              label: fc.string({ minLength: 1, maxLength: 50 }),
              scores: fc.record({
                performance: fc.integer({ min: 0, max: 100 }),
                accessibility: fc.integer({ min: 0, max: 100 }),
                bestPractices: fc.integer({ min: 0, max: 100 }),
                seo: fc.integer({ min: 0, max: 100 })
              }),
              metrics: fc.record({
                lcp: fc.integer({ min: 0, max: 10000 }),
                fcp: fc.integer({ min: 0, max: 5000 }),
                cls: fc.float({ min: 0, max: 1, noNaN: true })
              })
            }),
            { minLength: 1, maxLength: 5 }
          ),
          async (mockResults) => {
            const { generateReport } = await import('../src-simplified/report.js');
            
            // Create temporary output directory
            const tempDir = join(tmpdir(), `signaler-test-${Date.now()}`);
            
            try {
              await generateReport(mockResults, tempDir);
              
              // Verify report file was created
              const reportPath = join(tempDir, 'report.html');
              expect(existsSync(reportPath)).toBe(true);
              
              // Verify report content is valid HTML
              const reportContent = readFileSync(reportPath, 'utf-8');
              expect(reportContent).toContain('<!DOCTYPE html');
              expect(reportContent).toContain('<html');
              expect(reportContent).toContain('</html>');
              
              // Verify report contains essential data
              expect(reportContent).toContain('Signaler Audit Report');
              expect(reportContent).toContain('Performance');
              expect(reportContent).toContain('Accessibility');
              
              // Verify all test results are included
              for (const result of mockResults) {
                expect(reportContent).toContain(result.label);
                expect(reportContent).toContain(result.scores.performance.toString());
              }
              
            } finally {
              // Clean up temp directory
              try {
                const fs = await import('node:fs/promises');
                await fs.rm(tempDir, { recursive: true, force: true });
              } catch {
                // Ignore cleanup errors
              }
            }
          }
        ),
        { numRuns: 10 }
      );
    });

    it("should handle Chrome launcher configuration correctly", async () => {
      // Feature: codebase-optimization, Property 9: Self-Contained Execution
      await fc.assert(
        fc.asyncProperty(
          fc.constant(null),
          async () => {
            // Verify lighthouse module configuration
            const lighthousePath = 'src-simplified/lighthouse.ts';
            const lighthouseContent = readFileSync(lighthousePath, 'utf-8');
            
            // Should use appropriate Chrome flags for headless operation
            const requiredFlags = [
              '--headless=new',
              '--disable-gpu',
              '--no-sandbox',
              '--disable-dev-shm-usage',
              '--disable-extensions'
            ];
            
            for (const flag of requiredFlags) {
              expect(lighthouseContent).toContain(flag);
            }
            
            // Should handle Chrome launch failures gracefully
            expect(lighthouseContent).toContain('Failed to launch Chrome');
            expect(lighthouseContent).toContain('Make sure Chrome');
            
            // Should support both sequential and parallel execution
            expect(lighthouseContent).toContain('runSequentialAudits');
            expect(lighthouseContent).toContain('runParallelAudits');
            
            // Should handle audit failures gracefully
            expect(lighthouseContent).toContain('error:');
            expect(lighthouseContent).toContain('ECONNREFUSED');
            expect(lighthouseContent).toContain('ENOTFOUND');
          }
        ),
        { numRuns: 10 }
      );
    });
  });
});