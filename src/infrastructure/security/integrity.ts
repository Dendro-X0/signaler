import { createHash } from "node:crypto";
import { createReadStream } from "node:fs";
import { stat } from "node:fs/promises";

export interface IntegrityVerificationOptions {
  readonly trustedDomains: string[];
  readonly allowedAlgorithms: string[];
  readonly maxFileSize?: number; // bytes
  readonly requireHttps: boolean;
}

export interface IntegrityVerificationResult {
  readonly success: boolean;
  readonly verified: boolean;
  readonly error?: string;
  readonly details: {
    readonly sourceValid: boolean;
    readonly checksumValid?: boolean;
    readonly algorithm?: string;
    readonly expectedChecksum?: string;
    readonly actualChecksum?: string;
    readonly fileSize?: number;
  };
}

export interface SecurityWarning {
  readonly type: 'insecure_connection' | 'untrusted_domain' | 'checksum_unavailable' | 'large_file';
  readonly message: string;
  readonly severity: 'low' | 'medium' | 'high';
  readonly suggestion: string;
}

export class IntegrityVerifier {
  private readonly options: IntegrityVerificationOptions;

  constructor(options: Partial<IntegrityVerificationOptions> = {}) {
    this.options = {
      trustedDomains: options.trustedDomains ?? [
        'github.com',
        'api.github.com', 
        'objects.githubusercontent.com',
        'github-releases.githubusercontent.com',
        'codeload.github.com'
      ],
      allowedAlgorithms: options.allowedAlgorithms ?? ['sha256', 'sha512', 'sha1'],
      maxFileSize: options.maxFileSize ?? 100 * 1024 * 1024, // 100MB default
      requireHttps: options.requireHttps ?? true,
    };
  }

  /**
   * Verify the integrity of a downloaded file
   */
  async verifyIntegrity(
    filePath: string, 
    downloadUrl: string, 
    expectedChecksum?: string, 
    algorithm: string = 'sha256'
  ): Promise<IntegrityVerificationResult> {
    try {
      // Validate source domain
      const sourceValid = this.validateSource(downloadUrl);
      
      if (!sourceValid) {
        return {
          success: false,
          verified: false,
          error: `Untrusted source domain: ${new URL(downloadUrl).hostname}`,
          details: {
            sourceValid: false,
          }
        };
      }

      // Check file exists and get size
      const fileStats = await stat(filePath);
      const fileSize = fileStats.size;

      // Validate file size if limit is set
      if (this.options.maxFileSize && fileSize > this.options.maxFileSize) {
        return {
          success: false,
          verified: false,
          error: `File size ${fileSize} bytes exceeds maximum allowed size ${this.options.maxFileSize} bytes`,
          details: {
            sourceValid: true,
            fileSize,
          }
        };
      }

      // If no checksum provided, we can only validate source
      if (!expectedChecksum) {
        return {
          success: true,
          verified: false, // Can't verify integrity without checksum
          details: {
            sourceValid: true,
            fileSize,
          }
        };
      }

      // Validate algorithm
      if (!this.options.allowedAlgorithms.includes(algorithm)) {
        return {
          success: false,
          verified: false,
          error: `Unsupported hash algorithm: ${algorithm}`,
          details: {
            sourceValid: true,
            algorithm,
            expectedChecksum,
            fileSize,
          }
        };
      }

      // Calculate actual checksum
      const actualChecksum = await this.calculateChecksum(filePath, algorithm);
      const checksumValid = actualChecksum === expectedChecksum;

      if (!checksumValid) {
        return {
          success: false,
          verified: false,
          error: `Checksum verification failed. Expected: ${expectedChecksum}, Got: ${actualChecksum}`,
          details: {
            sourceValid: true,
            checksumValid: false,
            algorithm,
            expectedChecksum,
            actualChecksum,
            fileSize,
          }
        };
      }

      return {
        success: true,
        verified: true,
        details: {
          sourceValid: true,
          checksumValid: true,
          algorithm,
          expectedChecksum,
          actualChecksum,
          fileSize,
        }
      };

    } catch (error) {
      return {
        success: false,
        verified: false,
        error: error instanceof Error ? error.message : String(error),
        details: {
          sourceValid: false,
        }
      };
    }
  }

  /**
   * Validate that the download source is from a trusted domain
   */
  validateSource(downloadUrl: string): boolean {
    try {
      const url = new URL(downloadUrl);
      
      // Check if domain is in trusted list
      const isTrustedDomain = this.options.trustedDomains.includes(url.hostname);
      
      if (!isTrustedDomain) {
        // Allow localhost for testing
        if (url.hostname === 'localhost' || url.hostname === '127.0.0.1') {
          return true;
        }
        return false;
      }

      // For trusted domains, enforce HTTPS in production
      if (this.options.requireHttps && url.protocol !== 'https:') {
        return false;
      }

      return true;
    } catch {
      return false;
    }
  }

  /**
   * Calculate checksum of a file
   */
  async calculateChecksum(filePath: string, algorithm: string = 'sha256'): Promise<string> {
    return new Promise((resolve, reject) => {
      try {
        const hash = createHash(algorithm);
        const stream = createReadStream(filePath);

        stream.on('data', (data) => {
          hash.update(data);
        });

        stream.on('end', () => {
          resolve(hash.digest('hex'));
        });

        stream.on('error', reject);
      } catch (error) {
        reject(error);
      }
    });
  }

  /**
   * Detect potential security issues and generate warnings
   */
  generateSecurityWarnings(downloadUrl: string, fileSize?: number): SecurityWarning[] {
    const warnings: SecurityWarning[] = [];

    try {
      const url = new URL(downloadUrl);

      // Check for insecure connections
      if (url.protocol === 'http:' && url.hostname !== 'localhost' && url.hostname !== '127.0.0.1') {
        warnings.push({
          type: 'insecure_connection',
          message: `Downloading over insecure HTTP connection from ${url.hostname}`,
          severity: 'high',
          suggestion: 'Use HTTPS URLs for secure downloads. Verify the download source is legitimate.'
        });
      }

      // Check for untrusted domains
      if (!this.validateSource(downloadUrl)) {
        warnings.push({
          type: 'untrusted_domain',
          message: `Download source ${url.hostname} is not in the trusted domains list`,
          severity: 'high',
          suggestion: 'Only download from official GitHub domains or other trusted sources.'
        });
      }

      // Check for large files
      if (fileSize && this.options.maxFileSize && fileSize > this.options.maxFileSize * 0.8) {
        warnings.push({
          type: 'large_file',
          message: `File size ${Math.round(fileSize / 1024 / 1024)}MB is approaching the maximum limit`,
          severity: 'medium',
          suggestion: 'Large files may take longer to download and verify. Ensure you have sufficient disk space.'
        });
      }

    } catch {
      warnings.push({
        type: 'untrusted_domain',
        message: 'Invalid or malformed download URL',
        severity: 'high',
        suggestion: 'Verify the download URL is correct and properly formatted.'
      });
    }

    return warnings;
  }

  /**
   * Validate SSL certificate (basic check via URL parsing)
   */
  validateSSLCertificate(downloadUrl: string): boolean {
    try {
      const url = new URL(downloadUrl);
      
      // Basic validation - in a real implementation, you might want to
      // perform actual certificate validation using additional libraries
      if (url.protocol === 'https:') {
        // For now, we trust that Node.js HTTPS module validates certificates
        // In production, you might want additional certificate pinning
        return true;
      }
      
      // HTTP connections don't have SSL certificates
      return url.protocol === 'http:' && 
             (url.hostname === 'localhost' || url.hostname === '127.0.0.1');
    } catch {
      return false;
    }
  }

  /**
   * Detect file corruption by checking file structure
   */
  async detectFileCorruption(filePath: string, expectedMimeType?: string): Promise<boolean> {
    try {
      const fileStats = await stat(filePath);
      
      // Basic corruption detection
      if (fileStats.size === 0) {
        return true; // Empty file is likely corrupted
      }

      // For ZIP files, check basic structure
      if (expectedMimeType === 'application/zip' || filePath.endsWith('.zip')) {
        return this.validateZipStructure(filePath);
      }

      return false; // No corruption detected
    } catch {
      return true; // If we can't read the file, consider it corrupted
    }
  }

  /**
   * Basic ZIP file structure validation
   */
  private async validateZipStructure(filePath: string): Promise<boolean> {
    return new Promise((resolve) => {
      const stream = createReadStream(filePath, { start: 0, end: 3 });
      const chunks: Buffer[] = [];

      stream.on('data', (chunk: string | Buffer) => {
        chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
      });

      stream.on('end', () => {
        const header = Buffer.concat(chunks);
        
        // ZIP files should start with PK (0x504B)
        if (header.length >= 2) {
          const isValidZip = header[0] === 0x50 && header[1] === 0x4B;
          resolve(!isValidZip); // Return true if corrupted (invalid ZIP)
        } else {
          resolve(true); // Too small to be valid ZIP
        }
      });

      stream.on('error', () => {
        resolve(true); // Error reading file = corrupted
      });
    });
  }
}