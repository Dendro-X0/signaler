# Requirements Document

## Introduction

Signaler is a web performance auditing tool that helps teams move from noisy Lighthouse runs to structured, actionable insights. The project currently faces distribution challenges and has moved away from npm registry distribution in favor of a registry-free approach using GitHub Releases with portable ZIP files and installation scripts. This feature aims to improve the reliability and user experience of the distribution system.

## Glossary

- **Signaler**: The web performance auditing tool (formerly ApexAuditor)
- **Launcher**: The Rust-based stable entrypoint that orchestrates engine execution
- **Engine**: The Node.js/TypeScript audit logic and artifact writers
- **Portable_ZIP**: Self-contained distribution package containing all necessary components
- **Installation_Script**: PowerShell/Bash scripts that download and install Signaler globally
- **Registry_Free**: Distribution approach that avoids npm, JSR, or other package registries
- **GitHub_Releases**: Primary distribution channel using GitHub's release assets

## Requirements

### Requirement 1

**User Story:** As a developer, I want to install Signaler with a single command, so that I can quickly start auditing my web applications without complex setup procedures.

#### Acceptance Criteria

1. WHEN a user runs the PowerShell installation command, THE Installation_Script SHALL download the latest portable ZIP from GitHub Releases
2. WHEN a user runs the Bash installation command, THE Installation_Script SHALL download the latest portable ZIP from GitHub Releases  
3. WHEN the installation completes successfully, THE System SHALL make the `signaler` command available globally in the user's PATH
4. WHEN the installation fails due to network issues, THE Installation_Script SHALL provide clear error messages with retry suggestions
5. WHEN the installation fails due to permissions, THE Installation_Script SHALL suggest alternative installation methods

### Requirement 2

**User Story:** As a system administrator, I want Signaler to work reliably across different operating systems and environments, so that my team can use it consistently regardless of their development setup.

#### Acceptance Criteria

1. WHEN Signaler is installed on Windows, THE System SHALL function correctly with PowerShell and Command Prompt
2. WHEN Signaler is installed on macOS, THE System SHALL function correctly with Bash and Zsh shells
3. WHEN Signaler is installed on Linux distributions, THE System SHALL function correctly with common shell environments
4. WHEN Node.js is not available in PATH, THE System SHALL provide clear guidance on Node.js installation requirements
5. WHEN the user lacks write permissions to system directories, THE Installation_Script SHALL offer user-local installation options

### Requirement 3

**User Story:** As a developer, I want to easily update Signaler to the latest version, so that I can access new features and bug fixes without reinstalling from scratch.

#### Acceptance Criteria

1. WHEN a user runs `signaler upgrade`, THE System SHALL check for newer versions on GitHub Releases
2. WHEN a newer version is available, THE System SHALL download and install the update automatically
3. WHEN the upgrade completes, THE System SHALL preserve existing configuration files and audit artifacts
4. WHEN the upgrade fails, THE System SHALL maintain the previous working installation
5. WHEN no internet connection is available, THE System SHALL provide informative error messages about connectivity requirements

### Requirement 4

**User Story:** As a developer working in restricted environments, I want to use Signaler without requiring global installation, so that I can audit projects even when I cannot modify system PATH or install software globally.

#### Acceptance Criteria

1. WHEN a user downloads the portable ZIP, THE System SHALL run directly from the extracted folder without installation
2. WHEN using portable mode, THE System SHALL provide `run.cmd` and `run.sh` scripts for easy execution
3. WHEN using portable mode, THE System SHALL maintain all functionality available in the globally installed version
4. WHEN the portable ZIP is moved to a different location, THE System SHALL continue to function without reconfiguration
5. WHEN multiple portable versions exist, THE System SHALL operate independently without conflicts

### Requirement 5

**User Story:** As a CI/CD engineer, I want to integrate Signaler into automated pipelines reliably, so that I can include performance auditing in continuous integration workflows.

#### Acceptance Criteria

1. WHEN Signaler is installed in a CI environment, THE Installation_Script SHALL complete without interactive prompts
2. WHEN running in headless environments, THE System SHALL execute audits without requiring GUI components
3. WHEN network access is limited, THE System SHALL provide clear error messages about connectivity requirements
4. WHEN the CI environment has restricted permissions, THE System SHALL support user-local installation modes
5. WHEN multiple CI jobs run concurrently, THE System SHALL avoid conflicts between parallel installations

### Requirement 6

**User Story:** As a developer, I want clear feedback during installation and execution, so that I can troubleshoot issues and understand what Signaler is doing.

#### Acceptance Criteria

1. WHEN the installation starts, THE Installation_Script SHALL display progress information about download and setup steps
2. WHEN installation encounters errors, THE System SHALL provide specific error messages with suggested solutions
3. WHEN Signaler executes commands, THE System SHALL provide clear status updates and progress indicators
4. WHEN dependencies are missing, THE System SHALL identify specific missing components and installation guidance
5. WHEN the system environment is incompatible, THE System SHALL provide detailed compatibility information

### Requirement 7

**User Story:** As a security-conscious developer, I want to verify the integrity of Signaler downloads, so that I can ensure I'm installing authentic and unmodified software.

#### Acceptance Criteria

1. WHEN downloading from GitHub Releases, THE Installation_Script SHALL verify the download source is the official repository
2. WHEN the download completes, THE System SHALL validate file integrity using checksums or signatures where available
3. WHEN integrity verification fails, THE Installation_Script SHALL abort installation and provide clear error messages
4. WHEN using HTTPS connections, THE System SHALL validate SSL certificates properly
5. WHEN downloading over insecure connections, THE System SHALL warn users about potential security risks