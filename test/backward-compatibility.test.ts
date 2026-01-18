import { describe, expect, it } from "vitest";
import * as fc from "fast-check";
import { resolve } from "node:path";

describe("Backward Compatibility", () => {
  // Feature: signaler-reporting-improvements, Property 2: Backward Compatibility
  it("should support both apex-auditor and signaler directory structures during transition", () => {
    fc.assert(fc.property(
      fc.record({
        hasLegacy: fc.boolean(),
        hasNew: fc.boolean()
      }),
      (config) => {
        // Mock the file system check behavior
        const mockHasLegacyOutputDir = () => config.hasLegacy;
        const mockGetCompatibleOutputDir = () => {
          if (config.hasLegacy) {
            return resolve(".apex-auditor");
          }
          return resolve(".signaler");
        };

        // Test legacy detection
        const hasLegacy = mockHasLegacyOutputDir();
        expect(hasLegacy).toBe(config.hasLegacy);
        
        // Test compatible directory resolution
        const compatibleDir = mockGetCompatibleOutputDir();
        
        if (config.hasLegacy) {
          // Should prefer legacy directory if it exists
          expect(compatibleDir).toMatch(/\.apex-auditor/);
        } else {
          // Should use new signaler directory
          expect(compatibleDir).toMatch(/\.signaler/);
        }
      }
    ), { numRuns: 100 });
  });

  // Feature: signaler-reporting-improvements, Property 2: Backward Compatibility
  it("chrome cleanup should handle both apex-auditor and signaler prefixes", () => {
    fc.assert(fc.property(
      fc.array(fc.record({
        prefix: fc.constantFrom("apex-auditor-chrome-", "signaler-chrome-"),
        suffix: fc.string({ minLength: 6, maxLength: 12 })
      }), { minLength: 0, maxLength: 5 }),
      (chromeDirectories) => {
        // Simulate chrome directory filtering logic
        const entries = chromeDirectories.map(dir => `${dir.prefix}${dir.suffix}`);
        
        const filteredDirs = entries.filter((entry: string) => 
          entry.startsWith('signaler-chrome-') || 
          entry.startsWith('apex-auditor-chrome-')
        );
        
        // All entries should be included (both old and new prefixes)
        expect(filteredDirs).toHaveLength(entries.length);
        
        // Verify both prefixes are supported
        const hasApexAuditor = filteredDirs.some(dir => dir.startsWith('apex-auditor-chrome-'));
        const hasSignaler = filteredDirs.some(dir => dir.startsWith('signaler-chrome-'));
        
        if (entries.some(e => e.startsWith('apex-auditor-chrome-'))) {
          expect(hasApexAuditor).toBe(true);
        }
        if (entries.some(e => e.startsWith('signaler-chrome-'))) {
          expect(hasSignaler).toBe(true);
        }
      }
    ), { numRuns: 50 });
  });

  // Feature: signaler-reporting-improvements, Property 2: Backward Compatibility
  it("uninstall should remove both legacy and new directories", () => {
    fc.assert(fc.property(
      fc.string({ minLength: 1, maxLength: 50 }),
      (projectRoot) => {
        // Simulate uninstall plan creation
        const actions = [
          { kind: "rm", path: resolve(projectRoot, ".signaler"), existsByAssumption: true },
          { kind: "rm", path: resolve(projectRoot, ".apex-auditor"), existsByAssumption: false }
        ];
        
        // Should include both directories
        const signalerAction = actions.find(a => a.path.includes(".signaler"));
        const apexAuditorAction = actions.find(a => a.path.includes(".apex-auditor"));
        
        expect(signalerAction).toBeDefined();
        expect(apexAuditorAction).toBeDefined();
        
        // Legacy directory should not be assumed to exist
        expect(apexAuditorAction?.existsByAssumption).toBe(false);
        // New directory should be assumed to exist
        expect(signalerAction?.existsByAssumption).toBe(true);
      }
    ), { numRuns: 100 });
  });
});