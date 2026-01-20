import { describe, expect, it } from "vitest";
import * as fc from "fast-check";
import { readFile, access } from "node:fs/promises";
import { resolve } from "node:path";
import { constants } from "node:fs";

describe("Export Type Safety", () => {
  // Feature: jsr-score-optimization, Property 5: Export Type Safety
  it("should provide full TypeScript type information for all exported functions and classes", { timeout: 120000 }, async () => {
    const exportEntries = [
      { path: "./api", expectedExports: ["createSignalerAPI", "audit", "createConfig", "validateConfig", "getVersion"] },
      { path: "./cli", expectedExports: ["runAuditCli"] },
      { path: ".", expectedExports: ["runBin"] }
    ];

    for (const entry of exportEntries) {
      try {
        // Dynamically import the module to test exports
        const modulePath = entry.path === "." ? "index" : entry.path.replace("./", "");
        const module = await import(`../dist/${modulePath}.js`);
        
        // Check that expected exports exist
        for (const expectedExport of entry.expectedExports) {
          expect(module[expectedExport], `Expected export ${expectedExport} in ${entry.path}`).toBeDefined();
        }
        
        // Verify TypeScript declarations exist
        const dtsPath = resolve(`dist/${modulePath}.d.ts`);
        await access(dtsPath, constants.F_OK);
        
        // Read and validate TypeScript declarations
        const dtsContent = await readFile(dtsPath, 'utf-8');
        expect(dtsContent.length).toBeGreaterThan(0);
        
        // Check that declarations contain expected exports
        for (const expectedExport of entry.expectedExports) {
          const hasExport = dtsContent.includes(`export`) && 
                          (dtsContent.includes(expectedExport) || 
                           dtsContent.includes(`* from`));
          expect(hasExport, `Expected ${expectedExport} in TypeScript declarations for ${entry.path}`).toBe(true);
        }
        
      } catch (error) {
        throw new Error(`Export type safety validation failed for ${entry.path}: ${error}`);
      }
    }
  });

  // Feature: jsr-score-optimization, Property 5: Export Type Safety
  it("should support both default and named import patterns with full type information", { timeout: 120000 }, async () => {
    const importPatterns = [
      { 
        module: "./api", 
        namedImports: ["createSignalerAPI", "audit", "createConfig", "validateConfig", "getVersion"],
        hasDefault: false
      },
      { 
        module: "./cli", 
        namedImports: ["runAuditCli"],
        hasDefault: false
      },
      { 
        module: ".", 
        namedImports: ["runBin"],
        hasDefault: false
      }
    ];

    for (const pattern of importPatterns) {
      try {
        const modulePath = pattern.module === "." ? "index" : pattern.module.replace("./", "");
        const dtsPath = resolve(`dist/${modulePath}.d.ts`);
        
        // Verify TypeScript declaration file exists
        await access(dtsPath, constants.F_OK);
        const dtsContent = await readFile(dtsPath, 'utf-8');
        
        // Test named imports
        for (const namedImport of pattern.namedImports) {
          // Check if the named export is declared
          const hasNamedExport = dtsContent.includes(`export`) && 
                               (dtsContent.includes(namedImport) || 
                                dtsContent.includes(`* from`));
          expect(hasNamedExport, `Expected named import ${namedImport} in ${pattern.module}`).toBe(true);
        }
        
        // Test default export if expected
        if (pattern.hasDefault) {
          const hasDefaultExport = dtsContent.includes('export default') || 
                                 dtsContent.includes('export =');
          expect(hasDefaultExport, `Expected default export in ${pattern.module}`).toBe(true);
        }
        
        // Verify the actual module can be imported
        const module = await import(`../dist/${modulePath}.js`);
        expect(module, `Expected module ${pattern.module} to be importable`).toBeDefined();
        
      } catch (error) {
        throw new Error(`Import pattern validation failed for ${pattern.module}: ${error}`);
      }
    }
  });

  // Feature: jsr-score-optimization, Property 5: Export Type Safety
  it("should maintain backward compatibility while providing improved type safety", { timeout: 120000 }, async () => {
    const compatibilityChecks = [
      {
        module: "./api",
        legacyImports: ["audit", "createConfig", "validateConfig", "getVersion"],
        newTypeFeatures: ["SignalerAPI"]
      },
      {
        module: "./cli", 
        legacyImports: ["runAuditCli"],
        newTypeFeatures: []
      }
    ];

    for (const check of compatibilityChecks) {
      try {
        const modulePath = check.module.replace("./", "");
        
        // Test that legacy imports still work
        const module = await import(`../dist/${modulePath}.js`);
        
        for (const legacyImport of check.legacyImports) {
          expect(module[legacyImport], `Expected legacy import ${legacyImport} in ${check.module}`).toBeDefined();
          expect(typeof module[legacyImport], `Expected ${legacyImport} to be a function`).toBe('function');
        }
        
        // Test that new type features are available
        for (const newFeature of check.newTypeFeatures) {
          // For interfaces/types, we check the TypeScript declarations
          const dtsPath = resolve(`dist/${modulePath}.d.ts`);
          const dtsContent = await readFile(dtsPath, 'utf-8');
          
          const hasNewFeature = dtsContent.includes(newFeature);
          expect(hasNewFeature, `Expected new type feature ${newFeature} in ${check.module}`).toBe(true);
        }
        
      } catch (error) {
        throw new Error(`Backward compatibility check failed for ${check.module}: ${error}`);
      }
    }
  });

  // Feature: jsr-score-optimization, Property 5: Export Type Safety
  it("should provide proper entry points for CLI and programmatic usage", async () => {
    const entryPoints = [
      {
        name: "CLI Entry Point",
        path: "./cli",
        expectedType: "function",
        expectedExport: "runAuditCli"
      },
      {
        name: "Programmatic API Entry Point", 
        path: "./api",
        expectedType: "function",
        expectedExport: "createSignalerAPI"
      },
      {
        name: "Main Entry Point",
        path: ".",
        expectedType: "function", 
        expectedExport: "runBin"
      }
    ];

    for (const entryPoint of entryPoints) {
      try {
        const modulePath = entryPoint.path === "." ? "index" : entryPoint.path.replace("./", "");
        
        // Check that the module can be imported
        const module = await import(`../dist/${modulePath}.js`);
        expect(module, `Expected ${entryPoint.name} module to be importable`).toBeDefined();
        
        // Check that the expected export exists
        expect(module[entryPoint.expectedExport], `Expected export ${entryPoint.expectedExport} in ${entryPoint.name}`).toBeDefined();
        if (entryPoint.expectedType === "function") {
          expect(typeof module[entryPoint.expectedExport], `Expected ${entryPoint.expectedExport} to be a function`).toBe('function');
        }
        
        // Verify TypeScript declarations
        const dtsPath = resolve(`dist/${modulePath}.d.ts`);
        await access(dtsPath, constants.F_OK);
        
        const dtsContent = await readFile(dtsPath, 'utf-8');
        expect(dtsContent, `Expected TypeScript declarations for ${entryPoint.name}`).toContain('export');
        
      } catch (error) {
        throw new Error(`Entry point validation failed for ${entryPoint.name}: ${error}`);
      }
    }
  });

  // Feature: jsr-score-optimization, Property 5: Export Type Safety
  it("should pass JSR export validation requirements", async () => {
    const jsrConfigPath = resolve("jsr.json");
    
    try {
      await access(jsrConfigPath, constants.F_OK);
      
      // Read and parse jsr.json
      const configContent = await readFile(jsrConfigPath, 'utf-8');
      const config = JSON.parse(configContent);
      
      // Validate that exports exist and are properly configured
      expect(config.exports).toBeDefined();
      expect(typeof config.exports).toBe('object');
      
      const exportEntries = Object.entries(config.exports);
      expect(exportEntries.length).toBeGreaterThan(0);
      
      for (const [exportKey, exportValue] of exportEntries) {
        if (typeof exportValue === 'object' && exportValue !== null) {
          const exportObj = exportValue as { import?: string; types?: string };
          
          // Check that both import and types are defined for JSR compatibility
          expect(exportObj.import, `Expected import field for export ${exportKey}`).toBeDefined();
          expect(exportObj.types, `Expected types field for export ${exportKey}`).toBeDefined();
          
          if (exportObj.import && exportObj.types) {
            // Verify paths are consistent
            const importPath = exportObj.import.replace('./dist/', '');
            const typesPath = exportObj.types.replace('./dist/', '');
            
            expect(importPath.replace('.js', '')).toBe(typesPath.replace('.d.ts', ''));
          }
        }
      }
      
    } catch (error) {
      throw new Error(`JSR export validation failed: ${error}`);
    }
  });
});