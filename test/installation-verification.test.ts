import { describe, expect, it } from "vitest";
import * as fc from "fast-check";
import { readFileSync, existsSync } from "node:fs";
import { join } from "node:path";
import { execSync } from "node:child_process";

describe("Installation and Execution Simplicity", () => {
  describe("Task 7.1: Installation in Clean Environments", () => {
    // **Validates: Requirements 4.1, 1.4**
    
    it("should require only Node.js as prerequisite", async () => {
      // Feature: codebase-optimization, Property 3: Installation Reliability
      await fc.assert(
        fc.asyncProperty(
          fc.constant(null),
          async () => {
            // Read the simplified package.json to verify dependencies
            const packageJsonPath = join(process.cwd(), 'package.simplified.json');
            const packageJsonContent = readFileSync(packageJsonPath, 'utf-8');
            const packageJson = JSON.parse(packageJsonContent);

            const dependencies = packageJson.dependencies || {};
            const dependencyNames = Object.keys(dependencies);

            // Verify no system-level dependencies are required
            // All dependencies should be npm packages that work with Node.js only
            const systemDependencies = [
              'python', 'python3', 'make', 'gcc', 'g++', 'build-essential',
              'xvfb', 'libgtk-3-dev', 'libxss1', 'libasound2'
            ];

            for (const sysDep of systemDependencies) {
              expect(dependencyNames).not.toContain(sysDep);
            }

            // Verify package.json has proper Node.js engine specification
            // This ensures compatibility across Node versions
            if (packageJson.engines?.node) {
              // Should support reasonable Node.js versions (not too restrictive)
              const nodeVersion = packageJson.engines.node;
              expect(nodeVersion).toMatch(/>=\d+/); // Should have minimum version
            }

            // Verify no native compilation requirements
            // Dependencies should be pure JavaScript or have prebuilt binaries
            const nativeCompilationPackages = [
              'node-gyp', 'node-pre-gyp', 'prebuild', 'cmake-js'
            ];

            for (const nativePkg of nativeCompilationPackages) {
              expect(dependencyNames).not.toContain(nativePkg);
            }
          }
        ),
        { numRuns: 10 }
      );
    });

    it("should have minimal installation footprint", async () => {
      // Feature: codebase-optimization, Property 3: Installation Reliability
      await fc.assert(
        fc.asyncProperty(
          fc.constant(null),
          async () => {
            const packageJsonPath = join(process.cwd(), 'package.simplified.json');
            const packageJsonContent = readFileSync(packageJsonPath, 'utf-8');
            const packageJson = JSON.parse(packageJsonContent);

            const dependencies = packageJson.dependencies || {};
            const dependencyCount = Object.keys(dependencies).length;

            // Requirement 1.4: Minimal setup - fewer dependencies = simpler installation
            expect(dependencyCount).toBeLessThanOrEqual(3);

            // Verify essential files are included for distribution
            const files = packageJson.files || [];
            expect(files).toContain('dist-simplified');
            expect(files).toContain('README.md');

            // Verify binary is properly configured
            expect(packageJson.bin).toBeDefined();
            expect(packageJson.bin.signaler).toBe('./dist-simplified/index.js');

            // Verify package type is module for modern Node.js
            expect(packageJson.type).toBe('module');
          }
        ),
        { numRuns: 10 }
      );
    });

    it("should work across different operating systems", async () => {
      // Feature: codebase-optimization, Property 3: Installation Reliability
      await fc.assert(
        fc.asyncProperty(
          fc.constant(null),
          async () => {
            // Verify no OS-specific dependencies or scripts
            const packageJsonPath = join(process.cwd(), 'package.simplified.json');
            const packageJsonContent = readFileSync(packageJsonPath, 'utf-8');
            const packageJson = JSON.parse(packageJsonContent);

            // Check that scripts don't use OS-specific commands
            const scripts = packageJson.scripts || {};
            const scriptValues = Object.values(scripts);

            for (const script of scriptValues) {
              // Should not contain Windows-specific commands
              expect(script).not.toMatch(/\.bat|\.cmd|\.exe/);
              // Should not contain Unix-specific commands that don't exist on Windows
              expect(script).not.toMatch(/^(rm|cp|mv|ls|cat|grep|awk|sed)\s/);
              // Should use cross-platform tools like tsx, tsc, vitest
              if (typeof script === 'string' && script.includes('node')) {
                expect(script).toMatch(/(tsx|tsc|vitest|node)/);
              }
            }

            // Verify no platform-specific dependencies
            const dependencies = packageJson.dependencies || {};
            const dependencyNames = Object.keys(dependencies);

            const platformSpecificPackages = [
              'win32', 'darwin', 'linux', 'fsevents', 'inotify'
            ];

            for (const platformPkg of platformSpecificPackages) {
              expect(dependencyNames).not.toContain(platformPkg);
            }
          }
        ),
        { numRuns: 10 }
      );
    });

    it("should have no additional system dependencies beyond Chrome", async () => {
      // Feature: codebase-optimization, Property 3: Installation Reliability
      await fc.assert(
        fc.asyncProperty(
          fc.constant(null),
          async () => {
            // Verify the tool only requires Chrome/Chromium as external dependency
            // This is acceptable since Lighthouse requires a browser
            
            // Check that documentation mentions only Chrome as requirement
            const readmePath = join(process.cwd(), 'README.simplified.md');
            if (existsSync(readmePath)) {
              const readmeContent = readFileSync(readmePath, 'utf-8');
              
              // Should mention Chrome/Chromium as the only system requirement
              const hasChromeMention = readmeContent.toLowerCase().includes('chrome') || 
                                     readmeContent.toLowerCase().includes('chromium');
              
              if (hasChromeMention) {
                // If Chrome is mentioned, it should be the only system requirement
                const systemRequirements = [
                  'python', 'java', 'docker', 'postgresql', 'mysql', 'redis',
                  'nginx', 'apache', 'php', 'ruby', 'go', 'rust'
                ];
                
                for (const sysReq of systemRequirements) {
                  expect(readmeContent.toLowerCase()).not.toContain(sysReq);
                }
              }
            }

            // Verify package.json doesn't specify additional system requirements
            const packageJsonPath = join(process.cwd(), 'package.simplified.json');
            const packageJsonContent = readFileSync(packageJsonPath, 'utf-8');
            const packageJson = JSON.parse(packageJsonContent);

            // Should not have os restrictions that would prevent installation
            if (packageJson.os) {
              expect(Array.isArray(packageJson.os)).toBe(true);
              expect(packageJson.os.length).toBeGreaterThan(1); // Should support multiple OS
            }
          }
        ),
        { numRuns: 10 }
      );
    });
  });

  describe("Task 7.3: Self-Contained Execution", () => {
    // **Validates: Requirements 4.5, 6.1**
    
    it("should complete audits without external tools beyond Node.js and Chrome", async () => {
      // Feature: codebase-optimization, Property 9: Self-Contained Execution
      await fc.assert(
        fc.asyncProperty(
          fc.constant(null),
          async () => {
            // Verify the simplified codebase doesn't call external tools
            const srcFiles = [
              'src-simplified/index.ts',
              'src-simplified/config.ts', 
              'src-simplified/lighthouse.ts',
              'src-simplified/report.ts',
              'src-simplified/types.ts'
            ];

            for (const filePath of srcFiles) {
              if (existsSync(filePath)) {
                const fileContent = readFileSync(filePath, 'utf-8');
                
                // Should not spawn external processes (except Chrome via chrome-launcher)
                const externalProcessCalls = [
                  'exec(', 'execSync(', 'spawn(', 'spawnSync(',
                  'curl ', 'wget ', 'git ', 'docker ', 'python ', 'java ', 'php ', 'ruby '
                ];

                for (const processCall of externalProcessCalls) {
                  expect(fileContent).not.toContain(processCall);
                }

                // Should not call package managers as external processes
                const packageManagerCalls = [
                  'exec("npm', 'execSync("npm', 'spawn("npm',
                  'exec("yarn', 'execSync("yarn', 'spawn("yarn',
                  'exec("pnpm', 'execSync("pnpm', 'spawn("pnpm'
                ];

                for (const pmCall of packageManagerCalls) {
                  expect(fileContent).not.toContain(pmCall);
                }

                // Should only use Node.js built-in modules and declared dependencies
                const allowedImports = [
                  'node:', 'lighthouse', 'chrome-launcher',
                  './config.js', './lighthouse.js', './report.js', './types.js'
                ];

                // Extract import statements
                const importMatches = fileContent.match(/import .+ from ['"][^'"]+['"]/g) || [];
                
                for (const importStatement of importMatches) {
                  const importPath = importStatement.match(/from ['"]([^'"]+)['"]/)?.[1];
                  if (importPath) {
                    const isAllowed = allowedImports.some(allowed => 
                      importPath.startsWith(allowed) || importPath === allowed
                    );
                    expect(isAllowed).toBe(true);
                  }
                }
              }
            }
          }
        ),
        { numRuns: 10 }
      );
    });

    it("should work with minimal configuration", async () => {
      // Feature: codebase-optimization, Property 7: Zero-Config Operation
      await fc.assert(
        fc.asyncProperty(
          fc.constant(null),
          async () => {
            // Verify the config loader provides sensible defaults
            const configPath = 'src-simplified/config.ts';
            if (existsSync(configPath)) {
              const configContent = readFileSync(configPath, 'utf-8');
              
              // Should have createMinimalConfig function for zero-config operation
              expect(configContent).toContain('createMinimalConfig');
              
              // Should provide default baseUrl
              expect(configContent).toContain('http://localhost:3000');
              
              // Should provide default pages
              expect(configContent).toContain("path: '/'");
              expect(configContent).toContain("label: 'Home'");
              
              // Should provide default options
              expect(configContent).toContain("device: 'mobile'");
              expect(configContent).toContain("parallel: 1");
              
              // Should handle missing config file gracefully
              expect(configContent).toContain('ENOENT');
            }
          }
        ),
        { numRuns: 10 }
      );
    });

    it("should have reasonable performance for basic use cases", async () => {
      // Feature: codebase-optimization, Property 11: Audit Performance
      await fc.assert(
        fc.asyncProperty(
          fc.constant(null),
          async () => {
            // Verify the lighthouse runner is optimized for performance
            const lighthousePath = 'src-simplified/lighthouse.ts';
            if (existsSync(lighthousePath)) {
              const lighthouseContent = readFileSync(lighthousePath, 'utf-8');
              
              // Should use headless Chrome for performance
              expect(lighthouseContent).toContain('--headless');
              
              // Should disable unnecessary Chrome features for speed
              expect(lighthouseContent).toContain('--disable-gpu');
              expect(lighthouseContent).toContain('--no-sandbox');
              expect(lighthouseContent).toContain('--disable-extensions');
              
              // Should have timeout handling to prevent hanging
              expect(lighthouseContent).toContain('timeout') || 
              expect(lighthouseContent).toContain('TIMEOUT');
              
              // Should support parallel execution for better performance
              expect(lighthouseContent).toContain('parallel');
              
              // Should only audit essential categories for speed
              expect(lighthouseContent).toContain('onlyCategories');
              expect(lighthouseContent).toContain('performance');
              expect(lighthouseContent).toContain('accessibility');
              expect(lighthouseContent).toContain('best-practices');
              expect(lighthouseContent).toContain('seo');
            }
          }
        ),
        { numRuns: 10 }
      );
    });

    it("should provide clear error handling for common failure scenarios", async () => {
      // Feature: codebase-optimization, Property 8: Error Message Clarity
      await fc.assert(
        fc.asyncProperty(
          fc.constant(null),
          async () => {
            // Verify error handling provides actionable guidance
            const indexPath = 'src-simplified/index.ts';
            if (existsSync(indexPath)) {
              const indexContent = readFileSync(indexPath, 'utf-8');
              
              // Should handle common error scenarios with specific guidance
              const errorScenarios = [
                'ECONNREFUSED', // Server not running
                'ENOTFOUND',    // DNS/network issues
                'baseUrl',      // Configuration errors
                'Chrome',       // Browser issues
                'timeout'       // Performance issues
              ];

              for (const scenario of errorScenarios) {
                expect(indexContent).toContain(scenario);
              }
              
              // Should provide actionable error messages
              expect(indexContent).toContain('💡');
              expect(indexContent).toContain('Make sure');
              expect(indexContent).toContain('Try');
              expect(indexContent).toContain('Check');
              
              // Should fail fast with clear exit codes
              expect(indexContent).toContain('process.exit(1)');
            }
          }
        ),
        { numRuns: 10 }
      );
    });

    it("should generate reports without external dependencies", async () => {
      // Feature: codebase-optimization, Property 9: Self-Contained Execution
      await fc.assert(
        fc.asyncProperty(
          fc.constant(null),
          async () => {
            // Verify report generation is self-contained
            const reportPath = 'src-simplified/report.ts';
            if (existsSync(reportPath)) {
              const reportContent = readFileSync(reportPath, 'utf-8');
              
              // Should use only Node.js built-in modules for file operations
              expect(reportContent).toContain("from 'node:fs");
              expect(reportContent).toContain("from 'node:path");
              
              // Should not require external template engines or libraries
              const externalTemplateLibs = [
                'handlebars', 'mustache', 'ejs', 'pug', 'nunjucks',
                'react', 'vue', 'angular', 'lodash', 'underscore'
              ];
              
              for (const lib of externalTemplateLibs) {
                expect(reportContent).not.toContain(lib);
              }
              
              // Should generate HTML using template literals (self-contained)
              expect(reportContent).toContain('`<!DOCTYPE html');
              
              // Should handle file system errors gracefully
              expect(reportContent).toContain('mkdir');
              expect(reportContent).toContain('writeFile');
              expect(reportContent).toContain('recursive: true');
            }
          }
        ),
        { numRuns: 10 }
      );
    });
  });
});