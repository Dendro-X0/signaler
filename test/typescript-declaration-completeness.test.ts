import { describe, expect, it } from "vitest";
import * as fc from "fast-check";
import { readdir, stat, access } from "node:fs/promises";
import { resolve, join, extname, basename } from "node:path";
import { constants } from "node:fs";

describe("TypeScript Declaration Completeness", () => {
  // Feature: jsr-score-optimization, Property 1: TypeScript Declaration Completeness
  it("should have corresponding TypeScript declaration files for all JavaScript modules", async () => {
    const distPath = resolve("dist");
    
    // Get all JavaScript files in dist directory
    const getAllJsFiles = async (dir: string): Promise<string[]> => {
      const files: string[] = [];
      try {
        const entries = await readdir(dir);
        
        for (const entry of entries) {
          const fullPath = join(dir, entry);
          const stats = await stat(fullPath);
          
          if (stats.isDirectory()) {
            const subFiles = await getAllJsFiles(fullPath);
            files.push(...subFiles);
          } else if (extname(entry) === '.js') {
            files.push(fullPath);
          }
        }
      } catch (error) {
        // Directory might not exist, return empty array
        return [];
      }
      
      return files;
    };
    
    const jsFiles = await getAllJsFiles(distPath);
    expect(jsFiles.length).toBeGreaterThan(0); // Ensure we have JS files to test
    
    // Test each JS file has a corresponding .d.ts file
    for (const jsFilePath of jsFiles) {
      const baseName = basename(jsFilePath, '.js');
      const dirName = jsFilePath.replace(basename(jsFilePath), '');
      const expectedDtsPath = join(dirName, `${baseName}.d.ts`);
      
      try {
        await access(expectedDtsPath, constants.F_OK);
        // Declaration file exists - this is good
      } catch {
        throw new Error(`Missing TypeScript declaration file for ${jsFilePath}: expected ${expectedDtsPath}`);
      }
    }
  });

  // Feature: jsr-score-optimization, Property 1: TypeScript Declaration Completeness
  it("should have valid TypeScript declarations for key entry points", async () => {
    const keyEntryPoints = [
      "dist/index.js",
      "dist/bin.js", 
      "dist/api.js",
      "dist/cli.js"
    ];
    
    fc.assert(fc.property(
      fc.constantFrom(...keyEntryPoints),
      (modulePath) => {
        const fullPath = resolve(modulePath);
        const dtsPath = fullPath.replace('.js', '.d.ts');
        
        // Synchronous check using require.resolve-like logic
        try {
          // Check if files exist by attempting to construct paths
          const jsExists = require('fs').existsSync(fullPath);
          const dtsExists = require('fs').existsSync(dtsPath);
          
          expect(jsExists).toBe(true);
          expect(dtsExists).toBe(true);
          
          if (dtsExists) {
            const stats = require('fs').statSync(dtsPath);
            expect(stats.size).toBeGreaterThan(0);
          }
          
          return true;
        } catch (error) {
          throw new Error(`TypeScript declaration validation failed for ${modulePath}: ${error}`);
        }
      }
    ), { numRuns: 100 });
  });

  // Feature: jsr-score-optimization, Property 1: TypeScript Declaration Completeness
  it("should export TypeScript-compatible entry points in jsr.json", async () => {
    const jsrConfigPath = resolve("jsr.json");
    
    try {
      await access(jsrConfigPath, constants.F_OK);
      
      // Read and parse jsr.json
      const { readFile } = await import("node:fs/promises");
      const configContent = await readFile(jsrConfigPath, 'utf-8');
      const config = JSON.parse(configContent);
      
      // Validate that exports exist
      expect(config.exports).toBeDefined();
      expect(typeof config.exports).toBe('object');
      
      // Test each export using property-based testing
      const exportEntries = Object.entries(config.exports);
      expect(exportEntries.length).toBeGreaterThan(0);
      
      fc.assert(fc.property(
        fc.constantFrom(...exportEntries),
        ([exportKey, exportValue]) => {
          if (typeof exportValue === 'object' && exportValue !== null) {
            const exportObj = exportValue as { import?: string; types?: string };
            
            // Check that both import and types are defined
            expect(exportObj.import).toBeDefined();
            expect(exportObj.types).toBeDefined();
            
            if (exportObj.import && exportObj.types) {
              const importPath = resolve(exportObj.import);
              const typesPath = resolve(exportObj.types);
              
              const importExists = require('fs').existsSync(importPath);
              const typesExists = require('fs').existsSync(typesPath);
              
              expect(importExists).toBe(true);
              expect(typesExists).toBe(true);
            }
          } else if (typeof exportValue === 'string') {
            // Legacy string export format
            const fullExportPath = resolve(exportValue);
            const dtsPath = fullExportPath.replace('.js', '.d.ts');
            
            const jsExists = require('fs').existsSync(fullExportPath);
            const dtsExists = require('fs').existsSync(dtsPath);
            
            expect(jsExists).toBe(true);
            expect(dtsExists).toBe(true);
          }
          
          return true;
        }
      ), { numRuns: 100 });
      
    } catch (error) {
      throw new Error(`JSR configuration validation failed: ${error}`);
    }
  });
});