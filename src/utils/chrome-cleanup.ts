/**
 * Chrome process cleanup utilities
 */

import { exec } from "node:child_process";
import { promisify } from "node:util";
import { rm } from "node:fs/promises";

const execAsync = promisify(exec);

/**
 * Kill orphaned Chrome processes
 */
export async function killOrphanedChromeProcesses(): Promise<number> {
  const platform = process.platform;
  let killed = 0;
  
  try {
    if (platform === "win32") {
      // Windows: Kill Chrome processes
      const { stdout } = await execAsync('tasklist /FI "IMAGENAME eq chrome.exe" /FO CSV /NH');
      const lines = stdout.split('\n').filter(line => line.includes('chrome.exe'));
      
      for (const line of lines) {
        const match = line.match(/"(\d+)"/);
        if (match) {
          const pid = match[1];
          try {
            await execAsync(`taskkill /F /PID ${pid}`);
            killed++;
          } catch {
            // Process may have already exited
          }
        }
      }
    } else {
      // Unix-like: Kill Chrome processes
      try {
        const { stdout } = await execAsync('pgrep -f "chrome.*--headless"');
        const pids = stdout.trim().split('\n').filter(Boolean);
        
        for (const pid of pids) {
          try {
            await execAsync(`kill -9 ${pid}`);
            killed++;
          } catch {
            // Process may have already exited
          }
        }
      } catch {
        // No processes found
      }
    }
  } catch (error) {
    // Cleanup failed, but don't throw
    console.warn('Warning: Failed to cleanup Chrome processes:', error instanceof Error ? error.message : String(error));
  }
  
  return killed;
}

/**
 * Cleanup Chrome user data directories
 */
export async function cleanupChromeUserDataDirs(): Promise<number> {
  const tmpdir = require('node:os').tmpdir();
  const { readdir } = require('node:fs/promises');
  let cleaned = 0;
  
  try {
    const entries = await readdir(tmpdir);
    const chromeDirs = entries.filter((entry: string) => 
      entry.startsWith('apex-auditor-chrome-') || 
      entry.startsWith('signaler-chrome-')
    );
    
    for (const dir of chromeDirs) {
      try {
        await rm(`${tmpdir}/${dir}`, { recursive: true, force: true });
        cleaned++;
      } catch {
        // Directory may be in use or already deleted
      }
    }
  } catch (error) {
    console.warn('Warning: Failed to cleanup Chrome user data dirs:', error instanceof Error ? error.message : String(error));
  }
  
  return cleaned;
}

/**
 * Full Chrome cleanup (processes + directories)
 */
export async function fullChromeCleanup(): Promise<{ processes: number; directories: number }> {
  const [processes, directories] = await Promise.all([
    killOrphanedChromeProcesses(),
    cleanupChromeUserDataDirs(),
  ]);
  
  return { processes, directories };
}

/**
 * Setup cleanup handlers for graceful shutdown
 */
export function setupChromeCleanupHandlers(): void {
  const cleanup = async () => {
    console.log('\nCleaning up Chrome processes...');
    const result = await fullChromeCleanup();
    if (result.processes > 0 || result.directories > 0) {
      console.log(`Cleaned up ${result.processes} processes and ${result.directories} directories`);
    }
  };
  
  // Cleanup on exit
  process.on('exit', () => {
    // Synchronous cleanup only
    try {
      if (process.platform === 'win32') {
        require('child_process').execSync('taskkill /F /IM chrome.exe /T', { stdio: 'ignore' });
      } else {
        require('child_process').execSync('pkill -9 -f "chrome.*--headless"', { stdio: 'ignore' });
      }
    } catch {
      // Ignore errors
    }
  });
  
  // Cleanup on signals
  process.on('SIGINT', async () => {
    await cleanup();
    process.exit(0);
  });
  
  process.on('SIGTERM', async () => {
    await cleanup();
    process.exit(0);
  });
  
  // Cleanup on uncaught errors
  process.on('uncaughtException', async (error) => {
    console.error('Uncaught exception:', error);
    await cleanup();
    process.exit(1);
  });
  
  process.on('unhandledRejection', async (reason) => {
    console.error('Unhandled rejection:', reason);
    await cleanup();
    process.exit(1);
  });
}
