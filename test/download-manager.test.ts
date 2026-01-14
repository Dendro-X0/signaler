import { describe, expect, it, beforeEach, afterEach, vi } from "vitest";
import { createServer, Server } from "node:http";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { mkdir, rm, writeFile, readFile } from "node:fs/promises";
import { DownloadManager, type DownloadResult, type DownloadProgress } from "../src/infrastructure/network/download.js";

describe("DownloadManager", () => {
  let server: Server;
  let serverPort: number;
  let tempDir: string;
  let downloadManager: DownloadManager;

  beforeEach(async () => {
    // Create temp directory for test files
    tempDir = join(tmpdir(), `download-test-${Date.now()}`);
    await mkdir(tempDir, { recursive: true });

    // Create download manager with test settings
    downloadManager = new DownloadManager({
      maxRetries: 2,
      retryDelay: 100, // Fast retries for tests
      timeout: 5000,
      userAgent: "test-agent",
    });

    // Create test HTTP server
    server = createServer();
    await new Promise<void>((resolve) => {
      server.listen(0, () => {
        const address = server.address();
        serverPort = typeof address === 'object' && address ? address.port : 0;
        resolve();
      });
    });
  });

  afterEach(async () => {
    // Clean up
    server.close();
    await rm(tempDir, { recursive: true, force: true });
  });

  describe("Property 1: Installation download reliability", () => {
    // Feature: distribution-reliability, Property 1: Installation download reliability
    // **Validates: Requirements 1.1, 1.2**
    
    it("should successfully download files for any valid URL and destination", async () => {
      // Property: For any valid PowerShell or Bash environment with network connectivity,
      // running the installation command should successfully download the latest portable ZIP from GitHub Releases
      
      const testCases = [
        { content: "test content 1", filename: "test1.zip" },
        { content: "test content 2", filename: "test2.zip" },
        { content: "a".repeat(1000), filename: "large.zip" }, // Larger file
        { content: "", filename: "empty.zip" }, // Empty file
        { content: "special chars: àáâãäåæçèéêë", filename: "unicode.zip" },
      ];

      for (const testCase of testCases) {
        // Setup server to serve test content
        server.removeAllListeners('request');
        server.on('request', (req, res) => {
          res.writeHead(200, {
            'Content-Type': 'application/zip',
            'Content-Length': Buffer.byteLength(testCase.content).toString(),
          });
          res.end(testCase.content);
        });

        const url = `http://localhost:${serverPort}/${testCase.filename}`;
        const destination = join(tempDir, testCase.filename);

        const result: DownloadResult = await downloadManager.downloadWithRetry(url, destination);

        // Verify download succeeded
        expect(result.success).toBe(true);
        expect(result.filePath).toBe(destination);
        expect(result.error).toBeUndefined();
        expect(result.bytesDownloaded).toBe(Buffer.byteLength(testCase.content));

        // Verify file content
        const downloadedContent = await readFile(destination, 'utf8');
        expect(downloadedContent).toBe(testCase.content);
      }
    });

    it("should handle progress tracking correctly for any download size", async () => {
      const progressEvents: DownloadProgress[] = [];
      
      downloadManager.on('progress', (progress: DownloadProgress) => {
        progressEvents.push(progress);
      });

      const testContent = "x".repeat(50000); // Larger content to ensure progress events
      
      server.removeAllListeners('request');
      server.on('request', (req, res) => {
        res.writeHead(200, {
          'Content-Type': 'application/zip',
          'Content-Length': Buffer.byteLength(testContent).toString(),
        });
        
        // Send content in chunks with delays to trigger progress events
        const chunks = testContent.match(/.{1,5000}/g) || [];
        let i = 0;
        const sendChunk = () => {
          if (i < chunks.length) {
            res.write(chunks[i]);
            i++;
            setTimeout(sendChunk, 150); // Longer delay to ensure progress events are emitted
          } else {
            res.end();
          }
        };
        sendChunk();
      });

      const url = `http://localhost:${serverPort}/progress-test.zip`;
      const destination = join(tempDir, "progress-test.zip");

      const result = await downloadManager.downloadWithRetry(url, destination);

      expect(result.success).toBe(true);
      expect(progressEvents.length).toBeGreaterThan(0);
      
      // Verify progress events are monotonically increasing
      for (let i = 1; i < progressEvents.length; i++) {
        expect(progressEvents[i].bytesDownloaded).toBeGreaterThanOrEqual(
          progressEvents[i - 1].bytesDownloaded
        );
      }

      // Final result should have correct total bytes
      expect(result.bytesDownloaded).toBe(50000);
      
      // Progress events should show reasonable progression
      const finalProgress = progressEvents[progressEvents.length - 1];
      expect(finalProgress.bytesDownloaded).toBeGreaterThan(0);
      expect(finalProgress.bytesDownloaded).toBeLessThanOrEqual(result.bytesDownloaded);
    });

    it("should validate source URLs correctly for any GitHub domain", async () => {
      const validUrls = [
        "https://github.com/owner/repo/releases/download/v1.0.0/file.zip",
        "https://api.github.com/repos/owner/repo/releases/latest",
        "https://objects.githubusercontent.com/github-production-release-asset-2e65be/file.zip",
        "https://github-releases.githubusercontent.com/owner/repo/file.zip",
        "https://codeload.github.com/owner/repo/zip/main",
        `http://localhost:${serverPort}/test.zip`, // Allow localhost for testing
      ];

      const invalidUrls = [
        "https://malicious.com/fake-release.zip",
        "http://github.com/insecure", // HTTP GitHub should be invalid
        "https://fake-github.com/malicious.zip",
        "https://subdomain.evil.com/github.com/fake.zip",
        "ftp://github.com/file.zip",
      ];

      // Test valid URLs
      for (const url of validUrls) {
        const isValid = await downloadManager.validateSource(url);
        expect(isValid).toBe(true);
      }

      // Test invalid URLs  
      for (const url of invalidUrls) {
        const isValid = await downloadManager.validateSource(url);
        expect(isValid).toBe(false);
      }
    });

    it("should calculate checksums correctly for any file content", async () => {
      const testCases = [
        { content: "hello world", expectedSha256: "b94d27b9934d3e08a52e52d7da7dabfac484efe37a5380ee9088f7ace2efcde9" },
        { content: "", expectedSha256: "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855" },
        { content: "a".repeat(1000), expectedSha256: "41edece42d63e8d9bf515a9ba6932e1c20cbc9f5a5d134645adb5db1b9737ea3" },
      ];

      for (const testCase of testCases) {
        const filePath = join(tempDir, `checksum-test-${Date.now()}.txt`);
        await writeFile(filePath, testCase.content);

        const checksum = await downloadManager.calculateChecksum(filePath, 'sha256');
        expect(checksum).toBe(testCase.expectedSha256);
      }
    });
  });

  describe("Property 3: Network error handling", () => {
    // Feature: distribution-reliability, Property 3: Network error handling  
    // **Validates: Requirements 1.4, 3.5, 5.3**
    
    it("should retry on retryable network errors and provide clear error messages", async () => {
      const retryEvents: any[] = [];
      
      downloadManager.on('retry', (event) => {
        retryEvents.push(event);
      });

      // Test connection refused (retryable)
      const invalidUrl = `http://localhost:${serverPort + 1000}/nonexistent.zip`; // Wrong port
      const destination = join(tempDir, "retry-test.zip");

      const result = await downloadManager.downloadWithRetry(invalidUrl, destination);

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
      expect(result.retryCount).toBe(2); // Should have retried maxRetries times
      expect(retryEvents.length).toBe(2); // Should have 2 retry events
      
      // Verify retry events have proper structure
      for (const event of retryEvents) {
        expect(event).toHaveProperty('attempt');
        expect(event).toHaveProperty('maxRetries');
        expect(event).toHaveProperty('delay');
        expect(event).toHaveProperty('error');
        expect(typeof event.delay).toBe('number');
        expect(event.delay).toBeGreaterThan(0);
      }
    });

    it("should handle server errors with appropriate retry logic", async () => {
      let requestCount = 0;
      
      server.removeAllListeners('request');
      server.on('request', (req, res) => {
        requestCount++;
        
        if (requestCount <= 2) {
          // First two requests fail with 503 (retryable)
          res.writeHead(503, { 'Content-Type': 'text/plain' });
          res.end('Service Unavailable');
        } else {
          // Third request succeeds
          res.writeHead(200, { 'Content-Type': 'application/zip' });
          res.end('success content');
        }
      });

      const url = `http://localhost:${serverPort}/retry-success.zip`;
      const destination = join(tempDir, "retry-success.zip");

      const result = await downloadManager.downloadWithRetry(url, destination);

      expect(result.success).toBe(true);
      expect(requestCount).toBe(3); // Should have made 3 requests total
      expect(result.retryCount).toBe(2); // Should have retried 2 times
      
      const content = await readFile(destination, 'utf8');
      expect(content).toBe('success content');
    });

    it("should not retry on non-retryable errors", async () => {
      server.removeAllListeners('request');
      server.on('request', (req, res) => {
        // 404 is not retryable
        res.writeHead(404, { 'Content-Type': 'text/plain' });
        res.end('Not Found');
      });

      const url = `http://localhost:${serverPort}/not-found.zip`;
      const destination = join(tempDir, "not-found.zip");

      const result = await downloadManager.downloadWithRetry(url, destination);

      expect(result.success).toBe(false);
      expect(result.retryCount).toBe(0); // Should not have retried
      expect(result.error).toContain('404');
    });

    it("should handle timeout errors with retry", async () => {
      const shortTimeoutManager = new DownloadManager({
        maxRetries: 1,
        retryDelay: 100,
        timeout: 100, // Very short timeout
      });

      server.removeAllListeners('request');
      server.on('request', (req, res) => {
        // Don't respond immediately to trigger timeout
        setTimeout(() => {
          res.writeHead(200);
          res.end('delayed response');
        }, 200); // Longer than timeout
      });

      const url = `http://localhost:${serverPort}/timeout-test.zip`;
      const destination = join(tempDir, "timeout-test.zip");

      const result = await shortTimeoutManager.downloadWithRetry(url, destination);

      expect(result.success).toBe(false);
      expect(result.retryCount).toBe(1); // Should have retried once
      expect(result.error).toMatch(/timeout/i);
    });

    it("should support partial download resumption", async () => {
      const fullContent = "x".repeat(2000);
      const partialContent = fullContent.slice(0, 1000);
      
      // First, create a partial file
      const destination = join(tempDir, "resume-test.zip");
      await writeFile(destination, partialContent);

      let requestCount = 0;
      server.removeAllListeners('request');
      server.on('request', (req, res) => {
        requestCount++;
        
        const rangeHeader = req.headers.range;
        
        if (rangeHeader) {
          // Resume request - should have Range header
          expect(rangeHeader).toBe('bytes=1000-');
          
          res.writeHead(206, {
            'Content-Type': 'application/zip',
            'Content-Range': `bytes 1000-1999/2000`,
            'Content-Length': '1000',
          });
          res.end(fullContent.slice(1000)); // Send remaining content
        } else {
          // This shouldn't happen in resume scenario
          res.writeHead(200);
          res.end(fullContent);
        }
      });

      const resumeManager = new DownloadManager({
        resumeSupport: true,
        maxRetries: 1,
      });

      const url = `http://localhost:${serverPort}/resume-test.zip`;
      const result = await resumeManager.downloadWithRetry(url, destination);

      expect(result.success).toBe(true);
      expect(result.bytesDownloaded).toBe(2000);
      
      const finalContent = await readFile(destination, 'utf8');
      expect(finalContent).toBe(fullContent);
      expect(requestCount).toBe(1); // Should only make one request (resume)
    });
  });
});