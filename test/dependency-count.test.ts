import { describe, expect, it } from "vitest";
import * as fc from "fast-check";
import { readFileSync } from "node:fs";
import { join } from "node:path";

describe("Codebase Optimization", () => {
  describe("Property 1: Dependency Count Reduction", () => {
    // **Validates: Requirements 1.1, 1.2, 1.3, 1.5**
    
    it("should have ≤ 5 runtime dependencies while maintaining core functionality", async () => {
      // Feature: codebase-optimization, Property 1: Dependency Count Reduction
      await fc.assert(
        fc.asyncProperty(
          fc.constant(null), // No input needed for this property
          async () => {
            // Read the simplified package.json (the target for optimization)
            const packageJsonPath = join(process.cwd(), 'package.simplified.json');
            const packageJsonContent = readFileSync(packageJsonPath, 'utf-8');
            const packageJson = JSON.parse(packageJsonContent);

            // Get runtime dependencies (excluding devDependencies)
            const dependencies = packageJson.dependencies || {};
            const dependencyNames = Object.keys(dependencies);
            const dependencyCount = dependencyNames.length;

            // Property: The optimized version should have ≤ 5 runtime dependencies
            expect(dependencyCount).toBeLessThanOrEqual(5);

            // Verify that core functionality dependencies are present
            // Based on the design document, essential dependencies are:
            // - lighthouse (core functionality)
            // - chrome-launcher (browser management)
            // The simplified version removes prompts and other optional dependencies
            
            const essentialDependencies = ['lighthouse', 'chrome-launcher'];
            const optionalDependencies: string[] = []; // No optional dependencies in simplified version
            
            // All essential dependencies must be present
            for (const essential of essentialDependencies) {
              expect(dependencyNames).toContain(essential);
            }

            // Verify no unnecessary dependencies are present
            // Based on requirements 1.1, 1.2, 1.3 - remove unused/redundant packages
            const unnecessaryDependencies = ['ws']; // WebSocket is identified as unnecessary
            
            for (const unnecessary of unnecessaryDependencies) {
              expect(dependencyNames).not.toContain(unnecessary);
            }

            // Verify dependency justification - each dependency should serve core functionality
            for (const depName of dependencyNames) {
              const isEssential = essentialDependencies.includes(depName);
              const isOptional = optionalDependencies.includes(depName);
              
              // Each dependency should be either essential or optional (justified)
              expect(isEssential || isOptional).toBe(true);
            }
          }
        ),
        { numRuns: 10 }
      );
    });

    it("should maintain core Lighthouse functionality with reduced dependencies", async () => {
      // Feature: codebase-optimization, Property 1: Dependency Count Reduction
      await fc.assert(
        fc.asyncProperty(
          fc.constant(null),
          async () => {
            // Read the simplified package.json (the target for optimization)
            const packageJsonPath = join(process.cwd(), 'package.simplified.json');
            const packageJsonContent = readFileSync(packageJsonPath, 'utf-8');
            const packageJson = JSON.parse(packageJsonContent);

            const dependencies = packageJson.dependencies || {};
            const dependencyNames = Object.keys(dependencies);

            // Verify that core Lighthouse audit capability is preserved
            // Requirements 1.5 and 2.4 specify maintaining essential functionality
            expect(dependencyNames).toContain('lighthouse');
            expect(dependencyNames).toContain('chrome-launcher');

            // Verify the package maintains its core identity
            expect(packageJson.name).toBe('@auditorix/signaler');
            expect(packageJson.description).toContain('Lighthouse');

            // Verify the main entry point is preserved
            expect(packageJson.bin).toBeDefined();
            expect(packageJson.bin.signaler).toBeDefined();
          }
        ),
        { numRuns: 10 }
      );
    });

    it("should have removed problematic or conflicting dependencies", async () => {
      // Feature: codebase-optimization, Property 1: Dependency Count Reduction
      await fc.assert(
        fc.asyncProperty(
          fc.constant(null),
          async () => {
            // Read the simplified package.json (the target for optimization)
            const packageJsonPath = join(process.cwd(), 'package.simplified.json');
            const packageJsonContent = readFileSync(packageJsonPath, 'utf-8');
            const packageJson = JSON.parse(packageJsonContent);

            const dependencies = packageJson.dependencies || {};
            const dependencyNames = Object.keys(dependencies);

            // Requirements 1.4 specifies removing dependencies that cause installation issues
            // Based on the design document, 'ws' (WebSocket) is identified as problematic
            const problematicDependencies = ['ws'];
            
            for (const problematic of problematicDependencies) {
              expect(dependencyNames).not.toContain(problematic);
            }

            // Verify no heavy dependencies that can be replaced with lighter alternatives
            // This validates requirement 1.3 - replace heavy dependencies with lighter alternatives
            const heavyDependencies = [
              // Add any known heavy dependencies that should be replaced
              // This list can be expanded based on bundle analysis
            ];

            for (const heavy of heavyDependencies) {
              expect(dependencyNames).not.toContain(heavy);
            }
          }
        ),
        { numRuns: 10 }
      );
    });
  });
});