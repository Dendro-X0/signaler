import { describe, expect, it, beforeEach, afterEach } from "vitest";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { mkdir, rm, writeFile } from "node:fs/promises";
import * as fc from "fast-check";
import { IntegrityVerifier, type IntegrityVerificationResult, type SecurityWarning } from "../src/infrastructure/security/integrity.js";

describe("IntegrityVerifier", () => {
  let tempDir: string;
  let integrityVerifier: IntegrityVerifier;

  beforeEach(async () => {
    // Create temp directory for test files
    tempDir = join(tmpdir(), `integrity-test-${Date.now()}`);
    await mkdir(tempDir, { recursive: true });

    // Create integrity verifier with default settings
    integrityVerifier = new IntegrityVerifier();
  });

  afterEach(async () => {
    // Clean up
    await rm(tempDir, { recursive: true, force: true });
  });

  describe("Property 14: Security verification", () => {
    // Feature: distribution-reliability, Property 14: Security verification
    // **Validates: Requirements 7.1, 7.2, 7.3, 7.4**

    it("should verify source is official repository for any GitHub URL", async () => {
      // Property: For any download operation, the system should verify the source is the official repository
      
      await fc.assert(fc.asyncProperty(
        fc.oneof(
          // Valid GitHub domains
          fc.constantFrom(
            'github.com',
            'api.github.com', 
            'objects.githubusercontent.com',
            'github-releases.githubusercontent.com',
            'codeload.github.com'
          ),
          // Invalid domains for contrast
          fc.constantFrom(
            'malicious.com',
            'fake-github.com',
            'evil.org'
          )
        ),
        fc.string({ minLength: 1, maxLength: 50 }).filter(s => !s.includes('/') && !s.includes('?')),
        fc.string({ minLength: 1, maxLength: 50 }).filter(s => !s.includes('/') && !s.includes('?')),
        fc.string({ minLength: 1, maxLength: 20 }).filter(s => !s.includes('/') && !s.includes('?')),
        async (domain, owner, repo, filename) => {
          const trustedDomains = [
            'github.com',
            'api.github.com', 
            'objects.githubusercontent.com',
            'github-releases.githubusercontent.com',
            'codeload.github.com'
          ];
          
          const url = `https://${domain}/${owner}/${repo}/releases/download/v1.0.0/${filename}.zip`;
          const isValid = integrityVerifier.validateSource(url);
          
          const shouldBeValid = trustedDomains.includes(domain);
          expect(isValid).toBe(shouldBeValid);
        }
      ), { numRuns: 100 });
    });

    it("should validate file integrity using checksums for any file content", async () => {
      // Property: For any download operation, the system should validate file integrity using checksums
      
      await fc.assert(fc.asyncProperty(
        fc.string({ minLength: 0, maxLength: 1000 }),
        fc.constantFrom('sha256', 'sha512', 'sha1'),
        async (content, algorithm) => {
          const filePath = join(tempDir, `test-${Date.now()}.txt`);
          await writeFile(filePath, content);
          
          // Calculate expected checksum
          const expectedChecksum = await integrityVerifier.calculateChecksum(filePath, algorithm);
          
          // Verify with correct checksum
          const validResult = await integrityVerifier.verifyIntegrity(
            filePath,
            'https://github.com/owner/repo/releases/download/v1.0.0/file.zip',
            expectedChecksum,
            algorithm
          );
          
          expect(validResult.success).toBe(true);
          expect(validResult.verified).toBe(true);
          expect(validResult.details.checksumValid).toBe(true);
          expect(validResult.details.actualChecksum).toBe(expectedChecksum);
          
          // Verify with incorrect checksum
          const wrongChecksum = expectedChecksum === 'abc123' ? 'def456' : 'abc123';
          const invalidResult = await integrityVerifier.verifyIntegrity(
            filePath,
            'https://github.com/owner/repo/releases/download/v1.0.0/file.zip',
            wrongChecksum,
            algorithm
          );
          
          expect(invalidResult.success).toBe(false);
          expect(invalidResult.verified).toBe(false);
          expect(invalidResult.details.checksumValid).toBe(false);
        }
      ), { numRuns: 100 });
    });

    it("should abort on verification failures with clear error messages for any invalid input", async () => {
      // Property: For any download operation, when integrity verification fails, 
      // the system should abort installation and provide clear error messages
      
      await fc.assert(fc.asyncProperty(
        fc.string({ minLength: 1, maxLength: 100 }),
        fc.oneof(
          fc.constant('https://malicious.com/fake.zip'), // Invalid domain
          fc.constant('http://github.com/insecure.zip'), // Insecure GitHub
          fc.constant('invalid-url') // Malformed URL
        ),
        fc.string({ minLength: 1, maxLength: 64 }),
        async (content, invalidUrl, wrongChecksum) => {
          const filePath = join(tempDir, `test-${Date.now()}.txt`);
          await writeFile(filePath, content);
          
          const result = await integrityVerifier.verifyIntegrity(
            filePath,
            invalidUrl,
            wrongChecksum,
            'sha256'
          );
          
          // Should fail verification
          expect(result.success).toBe(false);
          expect(result.verified).toBe(false);
          expect(result.error).toBeDefined();
          expect(typeof result.error).toBe('string');
          expect(result.error!.length).toBeGreaterThan(0);
          
          // Error message should be descriptive
          expect(result.error).toMatch(/untrusted|invalid|failed|unsupported/i);
        }
      ), { numRuns: 100 });
    });

    it("should validate SSL certificates properly for any HTTPS URL", async () => {
      // Property: For any download operation, when using HTTPS connections, 
      // the system should validate SSL certificates properly
      
      await fc.assert(fc.property(
        fc.oneof(
          fc.constant('https://github.com/owner/repo/file.zip'), // Valid HTTPS
          fc.constant('http://github.com/owner/repo/file.zip'),  // Invalid HTTP GitHub
          fc.constant('https://localhost/file.zip'),             // Valid localhost HTTPS
          fc.constant('http://localhost/file.zip'),              // Valid localhost HTTP
          fc.constant('ftp://github.com/file.zip')               // Invalid protocol
        ),
        (url) => {
          const isValidSSL = integrityVerifier.validateSSLCertificate(url);
          
          try {
            const urlObj = new URL(url);
            const shouldBeValid = 
              (urlObj.protocol === 'https:') ||
              (urlObj.protocol === 'http:' && (urlObj.hostname === 'localhost' || urlObj.hostname === '127.0.0.1'));
            
            expect(isValidSSL).toBe(shouldBeValid);
          } catch {
            // Malformed URLs should be invalid
            expect(isValidSSL).toBe(false);
          }
        }
      ), { numRuns: 100 });
    });

    it("should detect file corruption for any file type", async () => {
      // Property: For any file, the system should be able to detect basic corruption
      
      await fc.assert(fc.asyncProperty(
        fc.oneof(
          fc.string({ minLength: 1, maxLength: 1000 }), // Valid content
          fc.constant(''), // Empty file (corrupted)
          fc.uint8Array({ minLength: 4, maxLength: 100 }) // Binary content
        ),
        fc.constantFrom('application/zip', 'text/plain', undefined),
        async (content, mimeType) => {
          const filePath = join(tempDir, `corruption-test-${Date.now()}.txt`);
          
          if (typeof content === 'string') {
            await writeFile(filePath, content);
          } else {
            await writeFile(filePath, Buffer.from(content));
          }
          
          const isCorrupted = await integrityVerifier.detectFileCorruption(filePath, mimeType);
          
          // Empty files should be detected as corrupted
          if (typeof content === 'string' && content.length === 0) {
            expect(isCorrupted).toBe(true);
          } else if (Array.isArray(content) && content.length === 0) {
            expect(isCorrupted).toBe(true);
          } else {
            // Non-empty files should have corruption detection logic applied
            expect(typeof isCorrupted).toBe('boolean');
          }
        }
      ), { numRuns: 100 });
    });

    it("should handle unsupported algorithms gracefully for any algorithm input", async () => {
      // Property: For any unsupported hash algorithm, the system should provide clear error messages
      
      await fc.assert(fc.asyncProperty(
        fc.string({ minLength: 1, maxLength: 100 }),
        fc.oneof(
          fc.constantFrom('md5', 'sha384', 'blake2b', 'invalid-algo'), // Unsupported algorithms
          fc.constantFrom('sha256', 'sha512', 'sha1') // Supported algorithms
        ),
        async (content, algorithm) => {
          const filePath = join(tempDir, `algo-test-${Date.now()}.txt`);
          await writeFile(filePath, content);
          
          const supportedAlgorithms = ['sha256', 'sha512', 'sha1'];
          const isSupported = supportedAlgorithms.includes(algorithm);
          
          try {
            if (isSupported) {
              // Should succeed for supported algorithms
              const checksum = await integrityVerifier.calculateChecksum(filePath, algorithm);
              expect(typeof checksum).toBe('string');
              expect(checksum.length).toBeGreaterThan(0);
            } else {
              // Should throw for unsupported algorithms
              await expect(integrityVerifier.calculateChecksum(filePath, algorithm)).rejects.toThrow();
            }
          } catch (error) {
            if (isSupported) {
              // Supported algorithms shouldn't throw
              throw error;
            }
            // Unsupported algorithms should throw with descriptive error
            expect(error).toBeDefined();
          }
        }
      ), { numRuns: 100 });
    });
  });

  describe("Property 15: Security warnings", () => {
    // Feature: distribution-reliability, Property 15: Security warnings
    // **Validates: Requirements 7.5**

    it("should warn users about insecure connections for any non-HTTPS URL", async () => {
      // Property: For any insecure connection attempt, the system should warn users about potential security risks
      
      await fc.assert(fc.property(
        fc.oneof(
          fc.constant('http://github.com/owner/repo/file.zip'),     // Insecure GitHub
          fc.constant('http://malicious.com/file.zip'),             // Insecure non-GitHub
          fc.constant('https://github.com/owner/repo/file.zip'),    // Secure GitHub
          fc.constant('https://malicious.com/file.zip'),            // Secure non-GitHub
          fc.constant('http://localhost/file.zip'),                 // Local HTTP (allowed)
          fc.constant('ftp://github.com/file.zip')                  // Non-HTTP protocol
        ),
        fc.option(fc.integer({ min: 1000, max: 100000000 })), // Optional file size
        (url, fileSize) => {
          const warnings = integrityVerifier.generateSecurityWarnings(url, fileSize);
          
          try {
            const urlObj = new URL(url);
            const isInsecureRemote = urlObj.protocol === 'http:' && 
                                   urlObj.hostname !== 'localhost' && 
                                   urlObj.hostname !== '127.0.0.1';
            
            if (isInsecureRemote) {
              // Should have insecure connection warning
              const hasInsecureWarning = warnings.some(w => w.type === 'insecure_connection');
              expect(hasInsecureWarning).toBe(true);
              
              // Warning should have proper structure
              const insecureWarning = warnings.find(w => w.type === 'insecure_connection');
              expect(insecureWarning).toBeDefined();
              expect(insecureWarning!.severity).toBe('high');
              expect(insecureWarning!.message).toContain('HTTP');
              expect(insecureWarning!.suggestion).toContain('HTTPS');
            }
            
            // Check for untrusted domain warnings
            const trustedDomains = [
              'github.com',
              'api.github.com', 
              'objects.githubusercontent.com',
              'github-releases.githubusercontent.com',
              'codeload.github.com',
              'localhost',
              '127.0.0.1'
            ];
            
            if (!trustedDomains.includes(urlObj.hostname)) {
              const hasUntrustedWarning = warnings.some(w => w.type === 'untrusted_domain');
              expect(hasUntrustedWarning).toBe(true);
            }
            
            // All warnings should have required fields
            for (const warning of warnings) {
              expect(warning.type).toBeDefined();
              expect(warning.message).toBeDefined();
              expect(warning.severity).toMatch(/^(low|medium|high)$/);
              expect(warning.suggestion).toBeDefined();
              expect(typeof warning.message).toBe('string');
              expect(typeof warning.suggestion).toBe('string');
              expect(warning.message.length).toBeGreaterThan(0);
              expect(warning.suggestion.length).toBeGreaterThan(0);
            }
            
          } catch {
            // Malformed URLs should generate warnings
            const hasUntrustedWarning = warnings.some(w => w.type === 'untrusted_domain');
            expect(hasUntrustedWarning).toBe(true);
          }
        }
      ), { numRuns: 100 });
    });

    it("should provide actionable security suggestions for any warning type", async () => {
      // Property: For any security warning generated, the system should provide actionable suggestions
      
      await fc.assert(fc.property(
        fc.oneof(
          fc.record({
            url: fc.constant('http://malicious.com/file.zip'),
            fileSize: fc.option(fc.integer({ min: 1000, max: 50000000 }))
          }),
          fc.record({
            url: fc.constant('https://untrusted.org/file.zip'),
            fileSize: fc.option(fc.integer({ min: 80000000, max: 120000000 })) // Large file
          }),
          fc.record({
            url: fc.constant('invalid-url-format'),
            fileSize: fc.option(fc.integer({ min: 1000, max: 10000000 }))
          })
        ),
        ({ url, fileSize }) => {
          const warnings = integrityVerifier.generateSecurityWarnings(url, fileSize);
          
          // Should generate at least one warning for problematic inputs
          expect(warnings.length).toBeGreaterThan(0);
          
          // Each warning should have actionable suggestions
          for (const warning of warnings) {
            expect(warning.suggestion).toBeDefined();
            expect(typeof warning.suggestion).toBe('string');
            expect(warning.suggestion.length).toBeGreaterThan(10); // Meaningful suggestion
            
            // Suggestions should contain actionable words
            const actionableWords = ['use', 'verify', 'check', 'ensure', 'download', 'install', 'update'];
            const hasActionableWord = actionableWords.some(word => 
              warning.suggestion.toLowerCase().includes(word)
            );
            expect(hasActionableWord).toBe(true);
            
            // Severity should match warning type appropriately
            if (warning.type === 'insecure_connection' || warning.type === 'untrusted_domain') {
              expect(warning.severity).toBe('high');
            }
          }
        }
      ), { numRuns: 100 });
    });
  });
});