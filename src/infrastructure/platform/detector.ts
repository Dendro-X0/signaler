import { platform, arch, release, homedir, tmpdir } from "node:os";
import { join } from "node:path";
import { access, constants } from "node:fs/promises";
import { execFile } from "node:child_process";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);

export interface OperatingSystem {
  readonly type: 'windows' | 'macos' | 'linux';
  readonly version: string;
  readonly architecture: string;
}

export interface ShellEnvironment {
  readonly type: 'powershell' | 'cmd' | 'bash' | 'zsh' | 'fish';
  readonly version: string;
  readonly profilePaths: readonly string[];
}

export interface PermissionLevel {
  readonly canWriteSystem: boolean;
  readonly canWriteUser: boolean;
  readonly canModifyPath: boolean;
  readonly isElevated: boolean;
}

export interface InstallationPaths {
  readonly globalBinDir: string;
  readonly userBinDir: string;
  readonly configDir: string;
  readonly cacheDir: string;
}

export interface NodeJsInfo {
  readonly available: boolean;
  readonly version?: string;
  readonly path?: string;
  readonly compatible: boolean;
}

export interface PlatformDetector {
  detectOS(): Promise<OperatingSystem>;
  detectShell(): Promise<ShellEnvironment>;
  checkPermissions(): Promise<PermissionLevel>;
  findInstallationPaths(): Promise<InstallationPaths>;
  detectNodeJs(): Promise<NodeJsInfo>;
}

export class DefaultPlatformDetector implements PlatformDetector {
  async detectOS(): Promise<OperatingSystem> {
    const platformType = platform();
    const architecture = arch();
    const version = release();

    let type: OperatingSystem['type'];
    switch (platformType) {
      case 'win32':
        type = 'windows';
        break;
      case 'darwin':
        type = 'macos';
        break;
      case 'linux':
        type = 'linux';
        break;
      default:
        // Default to linux for other Unix-like systems
        type = 'linux';
        break;
    }

    return {
      type,
      version,
      architecture,
    };
  }

  async detectShell(): Promise<ShellEnvironment> {
    const os = await this.detectOS();
    const shell = process.env.SHELL || '';
    const comspec = process.env.COMSPEC || '';

    // Detect shell type based on OS and environment
    let type: ShellEnvironment['type'];
    let profilePaths: string[] = [];

    if (os.type === 'windows') {
      // Check if PowerShell is available
      try {
        const { stdout } = await execFileAsync('powershell', ['-Command', '$PSVersionTable.PSVersion.ToString()'], { timeout: 5000 });
        type = 'powershell';
        profilePaths = [
          join(homedir(), 'Documents', 'PowerShell', 'Microsoft.PowerShell_profile.ps1'),
          join(homedir(), 'Documents', 'WindowsPowerShell', 'Microsoft.PowerShell_profile.ps1'),
        ];
        return {
          type,
          version: stdout.trim(),
          profilePaths,
        };
      } catch {
        // Fall back to cmd
        type = 'cmd';
        profilePaths = [];
        return {
          type,
          version: 'unknown',
          profilePaths,
        };
      }
    }

    // Unix-like systems
    if (shell.includes('zsh')) {
      type = 'zsh';
      profilePaths = [
        join(homedir(), '.zshrc'),
        join(homedir(), '.zprofile'),
      ];
    } else if (shell.includes('fish')) {
      type = 'fish';
      profilePaths = [
        join(homedir(), '.config', 'fish', 'config.fish'),
      ];
    } else {
      // Default to bash
      type = 'bash';
      profilePaths = [
        join(homedir(), '.bashrc'),
        join(homedir(), '.bash_profile'),
        join(homedir(), '.profile'),
      ];
    }

    // Try to get shell version
    let version = 'unknown';
    try {
      const shellPath = shell || type;
      const { stdout } = await execFileAsync(shellPath, ['--version'], { timeout: 5000 });
      // Extract version from first line
      const versionMatch = stdout.split('\n')[0].match(/(\d+\.\d+(?:\.\d+)?)/);
      if (versionMatch) {
        version = versionMatch[1];
      }
    } catch {
      // Version detection failed, keep 'unknown'
    }

    return {
      type,
      version,
      profilePaths,
    };
  }

  async checkPermissions(): Promise<PermissionLevel> {
    const os = await this.detectOS();
    const paths = await this.findInstallationPaths();

    let canWriteSystem = false;
    let canWriteUser = false;
    let canModifyPath = false;
    let isElevated = false;

    // Check if running as elevated user
    if (os.type === 'windows') {
      // On Windows, check if running as administrator
      try {
        await execFileAsync('net', ['session'], { timeout: 5000 });
        isElevated = true;
      } catch {
        isElevated = false;
      }
    } else {
      // On Unix-like systems, check if running as root
      isElevated = process.getuid?.() === 0;
    }

    // Test system directory write access
    try {
      await access(paths.globalBinDir, constants.W_OK);
      canWriteSystem = true;
    } catch {
      canWriteSystem = false;
    }

    // Test user directory write access
    try {
      await access(paths.userBinDir, constants.W_OK);
      canWriteUser = true;
    } catch {
      // Try to create user bin directory if it doesn't exist
      try {
        const { mkdir } = await import('node:fs/promises');
        await mkdir(paths.userBinDir, { recursive: true });
        canWriteUser = true;
      } catch {
        canWriteUser = false;
      }
    }

    // PATH modification capability depends on shell and permissions
    const shell = await this.detectShell();
    canModifyPath = canWriteUser && shell.profilePaths.length > 0;

    return {
      canWriteSystem,
      canWriteUser,
      canModifyPath,
      isElevated,
    };
  }

  async findInstallationPaths(): Promise<InstallationPaths> {
    const os = await this.detectOS();
    const home = homedir();

    let globalBinDir: string;
    let userBinDir: string;
    let configDir: string;
    let cacheDir: string;

    if (os.type === 'windows') {
      globalBinDir = process.env.ProgramFiles ? join(process.env.ProgramFiles, 'Signaler', 'bin') : 'C:\\Program Files\\Signaler\\bin';
      userBinDir = join(home, 'AppData', 'Local', 'Programs', 'Signaler', 'bin');
      configDir = join(home, 'AppData', 'Roaming', 'Signaler');
      cacheDir = join(home, 'AppData', 'Local', 'Signaler', 'Cache');
    } else if (os.type === 'macos') {
      globalBinDir = '/usr/local/bin';
      userBinDir = join(home, '.local', 'bin');
      configDir = join(home, 'Library', 'Application Support', 'Signaler');
      cacheDir = join(home, 'Library', 'Caches', 'Signaler');
    } else {
      // Linux and other Unix-like systems
      globalBinDir = '/usr/local/bin';
      userBinDir = join(home, '.local', 'bin');
      configDir = process.env.XDG_CONFIG_HOME ? join(process.env.XDG_CONFIG_HOME, 'signaler') : join(home, '.config', 'signaler');
      cacheDir = process.env.XDG_CACHE_HOME ? join(process.env.XDG_CACHE_HOME, 'signaler') : join(home, '.cache', 'signaler');
    }

    return {
      globalBinDir,
      userBinDir,
      configDir,
      cacheDir,
    };
  }

  async detectNodeJs(): Promise<NodeJsInfo> {
    try {
      const { stdout } = await execFileAsync('node', ['--version'], { timeout: 5000 });
      const version = stdout.trim();
      
      // Check if version is compatible (Node.js 18+)
      const versionMatch = version.match(/v(\d+)\.(\d+)\.(\d+)/);
      let compatible = false;
      if (versionMatch) {
        const major = parseInt(versionMatch[1], 10);
        compatible = major >= 18;
      }

      // Get Node.js path
      const { stdout: nodePath } = await execFileAsync('which', ['node'], { timeout: 5000 }).catch(() => ({ stdout: '' }));

      return {
        available: true,
        version,
        path: nodePath.trim() || undefined,
        compatible,
      };
    } catch {
      return {
        available: false,
        compatible: false,
      };
    }
  }
}

// Export a default instance
export const platformDetector: PlatformDetector = new DefaultPlatformDetector();