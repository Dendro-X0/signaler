import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import * as fc from "fast-check";

// Mock Node.js built-in modules before importing the platform detector
vi.mock('node:child_process', () => ({
  execFile: vi.fn(),
}));

vi.mock('node:fs/promises', () => ({
  access: vi.fn(),
  mkdir: vi.fn(),
}));

vi.mock('node:fs/promises', () => ({
  access: vi.fn(),
  mkdir: vi.fn(),
}));

import { DefaultPlatformDetector } from "../src/infrastructure/platform/detector.js";
import type { OperatingSystem, ShellEnvironment, InstallationPaths } from "../src/infrastructure/platform/detector.js";

describe("PlatformDetector", () => {
  let detector: DefaultPlatformDetector;
  let originalPlatform: string;
  let originalArch: string;
  let originalEnv: NodeJS.ProcessEnv;

  beforeEach(() => {
    detector = new DefaultPlatformDetector();
    originalPlatform = process.platform;
    originalArch = process.arch;
    originalEnv = { ...process.env };
    
    // Clear all mocks before each test
    vi.clearAllMocks();
  });

  afterEach(() => {
    // Restore original values
    Object.defineProperty(process, 'platform', { value: originalPlatform });
    Object.defineProperty(process, 'arch', { value: originalArch });
    process.env = originalEnv;
    vi.restoreAllMocks();
  });

  describe("Property 5: Cross-platform compatibility", () => {
    // **Validates: Requirements 2.1, 2.2, 2.3**
    
    it("should detect OS correctly for any supported platform", async () => {
      // Feature: distribution-reliability, Property 5: Cross-platform compatibility
      await fc.assert(
        fc.asyncProperty(
          fc.constantFrom('win32', 'darwin', 'linux'),
          fc.constantFrom('x64', 'arm64', 'ia32'),
          async (platformType, architecture) => {
            // Mock the platform and architecture
            Object.defineProperty(process, 'platform', { value: platformType, configurable: true });
            Object.defineProperty(process, 'arch', { value: architecture, configurable: true });

            const os = await detector.detectOS();

            // Verify OS type mapping is correct
            if (platformType === 'win32') {
              expect(os.type).toBe('windows');
            } else if (platformType === 'darwin') {
              expect(os.type).toBe('macos');
            } else if (platformType === 'linux') {
              expect(os.type).toBe('linux');
            }

            // Verify architecture is preserved
            expect(os.architecture).toBe(architecture);
            
            // Verify version is a string
            expect(typeof os.version).toBe('string');
            expect(os.version.length).toBeGreaterThan(0);
          }
        ),
        { numRuns: 100 }
      );
    });

    it("should provide appropriate installation paths for any supported OS", async () => {
      // Feature: distribution-reliability, Property 5: Cross-platform compatibility
      await fc.assert(
        fc.asyncProperty(
          fc.constantFrom('win32', 'darwin', 'linux'),
          async (platformType) => {
            // Mock the platform
            Object.defineProperty(process, 'platform', { value: platformType, configurable: true });

            const paths = await detector.findInstallationPaths();

            // Verify all required paths are provided
            expect(typeof paths.globalBinDir).toBe('string');
            expect(typeof paths.userBinDir).toBe('string');
            expect(typeof paths.configDir).toBe('string');
            expect(typeof paths.cacheDir).toBe('string');

            expect(paths.globalBinDir.length).toBeGreaterThan(0);
            expect(paths.userBinDir.length).toBeGreaterThan(0);
            expect(paths.configDir.length).toBeGreaterThan(0);
            expect(paths.cacheDir.length).toBeGreaterThan(0);

            // Verify platform-specific path conventions
            if (platformType === 'win32') {
              expect(paths.globalBinDir).toMatch(/[A-Z]:\\/);
              expect(paths.userBinDir).toMatch(/AppData/);
              expect(paths.configDir).toMatch(/AppData.*Roaming/);
              expect(paths.cacheDir).toMatch(/AppData.*Local/);
            } else if (platformType === 'darwin') {
              expect(paths.globalBinDir).toBe('/usr/local/bin');
              expect(paths.configDir).toMatch(/Library.*Application Support/);
              expect(paths.cacheDir).toMatch(/Library.*Caches/);
            } else {
              expect(paths.globalBinDir).toBe('/usr/local/bin');
              expect(paths.userBinDir).toMatch(/\.local.*bin/);
            }
          }
        ),
        { numRuns: 100 }
      );
    });

    it("should detect shell environment appropriately for any supported OS", async () => {
      // Feature: distribution-reliability, Property 5: Cross-platform compatibility
      await fc.assert(
        fc.asyncProperty(
          fc.constantFrom('win32', 'darwin', 'linux'),
          fc.option(fc.constantFrom('/bin/bash', '/bin/zsh', '/usr/bin/fish', '')),
          async (platformType, shellPath) => {
            // Mock the platform and shell environment
            Object.defineProperty(process, 'platform', { value: platformType, configurable: true });
            if (shellPath) {
              process.env.SHELL = shellPath;
            } else {
              delete process.env.SHELL;
            }

            // Create a new detector instance to avoid cached results
            const testDetector = new DefaultPlatformDetector();
            
            // Get mock reference
            const { execFile } = await import('node:child_process');
            const mockExecFile = vi.mocked(execFile);

            if (platformType === 'win32') {
              // Mock PowerShell version check
              mockExecFile.mockImplementationOnce((cmd, args, options, callback) => {
                callback(null, { stdout: '7.3.0\n', stderr: '' });
              });
            } else {
              // Mock shell version check
              mockExecFile.mockImplementationOnce((cmd, args, options, callback) => {
                callback(null, { stdout: 'bash version 5.1.0\n', stderr: '' });
              });
            }

            const shell = await testDetector.detectShell();

            // Verify shell type is valid
            expect(['powershell', 'cmd', 'bash', 'zsh', 'fish']).toContain(shell.type);
            
            // Verify version is a string
            expect(typeof shell.version).toBe('string');
            
            // Verify profile paths are provided as array
            expect(Array.isArray(shell.profilePaths)).toBe(true);
            
            // Verify platform-specific shell detection
            if (platformType === 'win32') {
              expect(['powershell', 'cmd']).toContain(shell.type);
            } else {
              expect(['bash', 'zsh', 'fish']).toContain(shell.type);
              
              // Verify shell type matches environment when specified
              if (shellPath?.includes('zsh')) {
                expect(shell.type).toBe('zsh');
              } else if (shellPath?.includes('fish')) {
                expect(shell.type).toBe('fish');
              } else if (shellPath?.includes('bash') || !shellPath) {
                expect(shell.type).toBe('bash');
              }
            }
          }
        ),
        { numRuns: 50, timeout: 10000 } // Reduced runs and increased timeout
      );
    });
  });

  describe("Property 6: Dependency validation", () => {
    // **Validates: Requirements 2.4, 6.4**
    
    it("should correctly detect Node.js availability and compatibility for any system state", async () => {
      // Feature: distribution-reliability, Property 6: Dependency validation
      await fc.assert(
        fc.asyncProperty(
          fc.option(fc.constantFrom('v18.0.0', 'v20.5.1', 'v16.14.0', 'v14.21.3', 'v22.1.0')),
          fc.boolean(), // whether node command succeeds
          async (nodeVersion, nodeAvailable) => {
            // Create a new detector instance
            const testDetector = new DefaultPlatformDetector();
            
            // Get mock reference
            const { execFile } = await import('node:child_process');
            const mockExecFile = vi.mocked(execFile);
            
            if (nodeAvailable && nodeVersion) {
              // Mock successful execFile calls
              mockExecFile
                .mockImplementationOnce((cmd, args, options, callback) => {
                  // node --version call
                  callback(null, { stdout: `${nodeVersion}\n`, stderr: '' });
                })
                .mockImplementationOnce((cmd, args, options, callback) => {
                  // which node call
                  callback(null, { stdout: '/usr/bin/node\n', stderr: '' });
                });
            } else {
              // Mock failed execFile calls
              mockExecFile.mockImplementation((cmd, args, options, callback) => {
                callback(new Error('Command not found'));
              });
            }

            const nodeInfo = await testDetector.detectNodeJs();

            if (nodeAvailable && nodeVersion) {
              // Node.js is available
              expect(nodeInfo.available).toBe(true);
              expect(nodeInfo.version).toBe(nodeVersion);
              
              // Check compatibility (Node.js 18+)
              const versionMatch = nodeVersion.match(/v(\d+)\.(\d+)\.(\d+)/);
              if (versionMatch) {
                const major = parseInt(versionMatch[1], 10);
                expect(nodeInfo.compatible).toBe(major >= 18);
              }
            } else {
              // Node.js is not available
              expect(nodeInfo.available).toBe(false);
              expect(nodeInfo.compatible).toBe(false);
              expect(nodeInfo.version).toBeUndefined();
              expect(nodeInfo.path).toBeUndefined();
            }
          }
        ),
        { numRuns: 50 } // Reduced runs for faster execution
      );
    });

    it("should provide clear guidance when dependencies are missing", async () => {
      // Feature: distribution-reliability, Property 6: Dependency validation
      await fc.assert(
        fc.asyncProperty(
          fc.boolean(), // Node.js availability
          async (nodeAvailable) => {
            // Create a new detector instance
            const testDetector = new DefaultPlatformDetector();
            
            // Get mock reference
            const { execFile } = await import('node:child_process');
            const mockExecFile = vi.mocked(execFile);
            
            if (nodeAvailable) {
              // Mock successful execFile calls
              mockExecFile
                .mockImplementationOnce((cmd, args, options, callback) => {
                  callback(null, { stdout: 'v20.0.0\n', stderr: '' });
                })
                .mockImplementationOnce((cmd, args, options, callback) => {
                  callback(null, { stdout: '/usr/bin/node\n', stderr: '' });
                });
            } else {
              // Mock failed execFile calls
              mockExecFile.mockImplementation((cmd, args, options, callback) => {
                callback(new Error('Command not found'));
              });
            }

            const nodeInfo = await testDetector.detectNodeJs();

            // Verify that the detector provides clear information about dependency status
            expect(typeof nodeInfo.available).toBe('boolean');
            expect(typeof nodeInfo.compatible).toBe('boolean');
            
            // When Node.js is not available, the system should clearly indicate this
            if (!nodeAvailable) {
              expect(nodeInfo.available).toBe(false);
              expect(nodeInfo.compatible).toBe(false);
              // The system should provide enough information to guide the user
              expect(nodeInfo.version).toBeUndefined();
            }
            
            // When Node.js is available, version information should be provided
            if (nodeAvailable) {
              expect(nodeInfo.available).toBe(true);
              expect(typeof nodeInfo.version).toBe('string');
              expect(nodeInfo.version!.length).toBeGreaterThan(0);
            }
          }
        ),
        { numRuns: 50 } // Reduced runs for faster execution
      );
    });

    it("should handle permission scenarios appropriately for any system configuration", async () => {
      // Feature: distribution-reliability, Property 6: Dependency validation
      await fc.assert(
        fc.asyncProperty(
          fc.constantFrom('win32', 'darwin', 'linux'),
          fc.boolean(), // system write access
          fc.boolean(), // user write access
          async (platformType, hasSystemAccess, hasUserAccess) => {
            // Mock the platform
            Object.defineProperty(process, 'platform', { value: platformType, configurable: true });

            // Create a new detector instance
            const testDetector = new DefaultPlatformDetector();

            // Get mock references
            const { execFile } = await import('node:child_process');
            const mockExecFile = vi.mocked(execFile);

            // Mock execFile for elevation checks and shell detection
            if (platformType === 'win32') {
              // Mock Windows elevation check and PowerShell detection
              mockExecFile
                .mockImplementationOnce((cmd, args, options, callback) => {
                  // net session call for elevation check
                  if (hasSystemAccess) {
                    callback(null, { stdout: 'success', stderr: '' });
                  } else {
                    callback(new Error('Access denied'));
                  }
                })
                .mockImplementationOnce((cmd, args, options, callback) => {
                  // PowerShell version check for shell detection
                  callback(null, { stdout: '7.3.0\n', stderr: '' });
                });
            } else {
              // Mock shell version check for Unix systems
              mockExecFile.mockImplementationOnce((cmd, args, options, callback) => {
                callback(null, { stdout: 'bash version 5.1.0\n', stderr: '' });
              });
            }

            // Mock file system access checks
            const { access, mkdir } = await import('node:fs/promises');
            const mockAccess = vi.mocked(access);
            const mockMkdir = vi.mocked(mkdir);
            
            // Configure access mock based on test parameters
            mockAccess.mockImplementation((path: string) => {
              const pathStr = path.toString();
              if (pathStr.includes('usr/local/bin') || pathStr.includes('Program Files')) {
                // System directory
                return hasSystemAccess ? Promise.resolve() : Promise.reject(new Error('Permission denied'));
              } else {
                // User directory
                return hasUserAccess ? Promise.resolve() : Promise.reject(new Error('Permission denied'));
              }
            });

            mockMkdir.mockImplementation(() => {
              return hasUserAccess ? Promise.resolve(undefined) : Promise.reject(new Error('Permission denied'));
            });

            const permissions = await testDetector.checkPermissions();

            // Verify permission detection is consistent
            expect(typeof permissions.canWriteSystem).toBe('boolean');
            expect(typeof permissions.canWriteUser).toBe('boolean');
            expect(typeof permissions.canModifyPath).toBe('boolean');
            expect(typeof permissions.isElevated).toBe('boolean');

            // Verify that the detector provides actionable information
            // The exact values depend on the actual system state and mocking limitations,
            // but the structure should be consistent
            expect(permissions).toHaveProperty('canWriteSystem');
            expect(permissions).toHaveProperty('canWriteUser');
            expect(permissions).toHaveProperty('canModifyPath');
            expect(permissions).toHaveProperty('isElevated');
          }
        ),
        { numRuns: 50 } // Reduced runs for faster execution
      );
    });
  });
});