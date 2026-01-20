import { describe, expect, it } from "vitest";
import * as fc from "fast-check";
import { readFile, access } from "node:fs/promises";
import { resolve } from "node:path";
import { constants } from "node:fs";

describe("Package Metadata Completeness", () => {
  // Feature: jsr-score-optimization, Property 3: Package Metadata Completeness
  it("should have comprehensive package.json metadata", async () => {
    const packageJsonPath = resolve("package.json");
    
    try {
      await access(packageJsonPath, constants.F_OK);
      
      const packageContent = await readFile(packageJsonPath, 'utf-8');
      const packageJson = JSON.parse(packageContent);
      
      // Required metadata fields for JSR scoring
      const requiredFields = [
        'name',
        'version', 
        'description',
        'keywords',
        'author',
        'repository',
        'license',
        'engines'
      ];
      
      fc.assert(fc.property(
        fc.constantFrom(...requiredFields),
        (fieldName) => {
          expect(packageJson[fieldName]).toBeDefined();
          expect(packageJson[fieldName]).not.toBe('');
          expect(packageJson[fieldName]).not.toBe(null);
          
          // Specific validation for different field types
          if (fieldName === 'keywords') {
            expect(Array.isArray(packageJson[fieldName])).toBe(true);
            expect(packageJson[fieldName].length).toBeGreaterThan(0);
            
            // Each keyword should be a non-empty string
            packageJson[fieldName].forEach((keyword: any) => {
              expect(typeof keyword).toBe('string');
              expect(keyword.trim().length).toBeGreaterThan(0);
            });
          }
          
          if (fieldName === 'author') {
            // Author can be string or object
            const author = packageJson[fieldName];
            if (typeof author === 'string') {
              expect(author.trim().length).toBeGreaterThan(0);
            } else if (typeof author === 'object') {
              expect(author.name).toBeDefined();
              expect(typeof author.name).toBe('string');
              expect(author.name.trim().length).toBeGreaterThan(0);
            }
          }
          
          if (fieldName === 'repository') {
            // Repository can be string or object
            const repo = packageJson[fieldName];
            if (typeof repo === 'string') {
              expect(repo.trim().length).toBeGreaterThan(0);
              expect(repo).toMatch(/^(https?:\/\/|git\+)/); // Should be a valid URL or git URL
            } else if (typeof repo === 'object') {
              expect(repo.type).toBeDefined();
              expect(repo.url).toBeDefined();
              expect(typeof repo.url).toBe('string');
              expect(repo.url.trim().length).toBeGreaterThan(0);
            }
          }
          
          if (fieldName === 'engines') {
            expect(typeof packageJson[fieldName]).toBe('object');
            expect(packageJson[fieldName].node).toBeDefined();
            expect(typeof packageJson[fieldName].node).toBe('string');
            expect(packageJson[fieldName].node.trim().length).toBeGreaterThan(0);
          }
          
          return true;
        }
      ), { numRuns: 100 });
      
    } catch (error) {
      throw new Error(`Package.json validation failed: ${error}`);
    }
  });

  // Feature: jsr-score-optimization, Property 3: Package Metadata Completeness
  it("should have properly configured jsr.json publication settings", async () => {
    const jsrJsonPath = resolve("jsr.json");
    
    try {
      await access(jsrJsonPath, constants.F_OK);
      
      const jsrContent = await readFile(jsrJsonPath, 'utf-8');
      const jsrJson = JSON.parse(jsrContent);
      
      // Required JSR configuration fields
      const requiredJsrFields = [
        'name',
        'version',
        'exports',
        'publish'
      ];
      
      fc.assert(fc.property(
        fc.constantFrom(...requiredJsrFields),
        (fieldName) => {
          expect(jsrJson[fieldName]).toBeDefined();
          expect(jsrJson[fieldName]).not.toBe('');
          expect(jsrJson[fieldName]).not.toBe(null);
          
          if (fieldName === 'exports') {
            expect(typeof jsrJson[fieldName]).toBe('object');
            expect(Object.keys(jsrJson[fieldName]).length).toBeGreaterThan(0);
            
            // Each export should have proper structure
            Object.entries(jsrJson[fieldName]).forEach(([key, value]) => {
              if (typeof value === 'object' && value !== null) {
                const exportObj = value as { import?: string; types?: string };
                expect(exportObj.import).toBeDefined();
                expect(exportObj.types).toBeDefined();
                expect(typeof exportObj.import).toBe('string');
                expect(typeof exportObj.types).toBe('string');
              }
            });
          }
          
          if (fieldName === 'publish') {
            expect(typeof jsrJson[fieldName]).toBe('object');
            const publishConfig = jsrJson[fieldName];
            
            if (publishConfig.include) {
              expect(Array.isArray(publishConfig.include)).toBe(true);
              expect(publishConfig.include.length).toBeGreaterThan(0);
            }
            
            if (publishConfig.exclude) {
              expect(Array.isArray(publishConfig.exclude)).toBe(true);
            }
          }
          
          return true;
        }
      ), { numRuns: 100 });
      
    } catch (error) {
      throw new Error(`JSR.json validation failed: ${error}`);
    }
  });

  // Feature: jsr-score-optimization, Property 3: Package Metadata Completeness
  it("should have valid license information", async () => {
    const packageJsonPath = resolve("package.json");
    const licensePath = resolve("LICENSE");
    
    try {
      // Check package.json has license field
      const packageContent = await readFile(packageJsonPath, 'utf-8');
      const packageJson = JSON.parse(packageContent);
      
      expect(packageJson.license).toBeDefined();
      expect(typeof packageJson.license).toBe('string');
      expect(packageJson.license.trim().length).toBeGreaterThan(0);
      
      // Check LICENSE file exists
      await access(licensePath, constants.F_OK);
      
      const licenseContent = await readFile(licensePath, 'utf-8');
      expect(licenseContent.trim().length).toBeGreaterThan(0);
      
      // Property test for license consistency
      fc.assert(fc.property(
        fc.constant(packageJson.license),
        (licenseType) => {
          // Common license types should be recognized
          const commonLicenses = ['MIT', 'Apache-2.0', 'GPL-3.0', 'BSD-3-Clause', 'ISC'];
          const isCommonLicense = commonLicenses.includes(licenseType);
          const isValidSPDX = /^[A-Za-z0-9\-\.]+$/.test(licenseType);
          
          expect(isCommonLicense || isValidSPDX).toBe(true);
          
          return true;
        }
      ), { numRuns: 100 });
      
    } catch (error) {
      throw new Error(`License validation failed: ${error}`);
    }
  });

  // Feature: jsr-score-optimization, Property 3: Package Metadata Completeness
  it("should have platform requirements and runtime specifications", async () => {
    const packageJsonPath = resolve("package.json");
    
    try {
      const packageContent = await readFile(packageJsonPath, 'utf-8');
      const packageJson = JSON.parse(packageContent);
      
      // Test engines field
      expect(packageJson.engines).toBeDefined();
      expect(typeof packageJson.engines).toBe('object');
      
      fc.assert(fc.property(
        fc.constant(packageJson.engines),
        (engines) => {
          // Should specify Node.js version
          expect(engines.node).toBeDefined();
          expect(typeof engines.node).toBe('string');
          
          // Node version should be a valid semver range
          const nodeVersion = engines.node;
          expect(nodeVersion).toMatch(/^>=?\d+\.\d+\.\d+$|^>=?\d+\.\d+$|^>=?\d+$/);
          
          // Should be a reasonable minimum version (Node 16+)
          const versionMatch = nodeVersion.match(/(\d+)/);
          if (versionMatch) {
            const majorVersion = parseInt(versionMatch[1]);
            expect(majorVersion).toBeGreaterThanOrEqual(16);
          }
          
          return true;
        }
      ), { numRuns: 100 });
      
      // Test type field for ESM/CommonJS specification
      if (packageJson.type) {
        expect(['module', 'commonjs']).toContain(packageJson.type);
      }
      
    } catch (error) {
      throw new Error(`Platform requirements validation failed: ${error}`);
    }
  });
});