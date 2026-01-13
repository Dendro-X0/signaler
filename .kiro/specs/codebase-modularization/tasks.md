# Implementation Plan: Codebase Modularization

## Overview

This implementation plan outlines the step-by-step process to reorganize the Signaler codebase from a flat structure to a modular architecture. The migration will be done incrementally to maintain functionality throughout the process.

## Tasks

- [x] 1. Create module directory structure and base files
  - Create the new directory structure with index files
  - Set up TypeScript path mapping for new modules
  - Create base interfaces and types for each module
  - _Requirements: 1.1, 1.2_

- [ ]* 1.1 Write property test for module structure validation
  - **Property 4: File Organization Consistency**
  - **Validates: Requirements 1.1, 1.2**

- [-] 2. Migrate core module files
  - [x] 2.1 Move and refactor types.ts to core/types.ts
    - Extract shared types used across modules
    - Create module-specific type files where needed
    - Update all import references
    - _Requirements: 2.1, 2.2_

  - [x] 2.2 Move and refactor config.ts to core/config.ts
    - Separate configuration loading from CLI-specific logic
    - Create clean configuration API
    - Update all configuration consumers
    - _Requirements: 2.1, 2.2_

  - [x] 2.3 Create core audit engine abstraction
    - Extract common audit orchestration logic
    - Define interfaces for audit runners
    - Implement runner registry system
    - _Requirements: 2.2, 4.2_

- [ ]* 2.4 Write property test for core API compatibility
  - **Property 3: API Compatibility**
  - **Validates: Requirements 9.1, 9.2**

- [x] 3. Migrate infrastructure module files
  - [x] 3.1 Move platform detection to infrastructure/platform/
    - Move platform-detector.ts to infrastructure/platform/detector.ts
    - Create platform service interface
    - Update all platform detection consumers
    - _Requirements: 6.1, 6.2_

  - [x] 3.2 Move network utilities to infrastructure/network/
    - Move download-manager.ts to infrastructure/network/download.ts
    - Move webhooks.ts to infrastructure/network/webhooks.ts
    - Create network service interfaces
    - _Requirements: 6.1, 6.2_

  - [x] 3.3 Move security utilities to infrastructure/security/
    - Move integrity-verifier.ts to infrastructure/security/integrity.ts
    - Create security service interfaces
    - Update all security utility consumers
    - _Requirements: 6.1, 6.2_

  - [x] 3.4 Move filesystem utilities to infrastructure/filesystem/
    - Move fs-utils.ts to infrastructure/filesystem/utils.ts
    - Move output-dir.ts to infrastructure/filesystem/output.ts
    - Create filesystem service interfaces
    - _Requirements: 6.1, 6.2_

- [ ]* 3.5 Write property test for infrastructure module isolation
  - **Property 1: Module Isolation**
  - **Validates: Requirements 8.1, 8.2**

- [x] 4. Migrate UI module files
  - [x] 4.1 Move UI components to ui/components/
    - Move ui/render-panel.ts to ui/components/panel.ts
    - Move ui/render-table.ts to ui/components/table.ts
    - Create component interfaces and base classes
    - _Requirements: 7.1, 7.2_

  - [x] 4.2 Move theme system to ui/themes/
    - Move ui/ui-theme.ts to ui/themes/theme.ts
    - Extract color definitions to separate file
    - Create theme service interface
    - _Requirements: 7.1, 7.2_

  - [x] 4.3 Move progress indicators to ui/components/
    - Move spinner.ts to ui/components/progress.ts
    - Create progress indicator interfaces
    - Update all progress indicator consumers
    - _Requirements: 7.1, 7.2_

- [ ]* 4.4 Write property test for UI component reusability
  - **Property 1: Module Isolation**
  - **Validates: Requirements 7.2, 7.3**

- [ ] 5. Migrate runners module files
  - [x] 5.1 Create Lighthouse runner module
    - Move lighthouse-runner.ts to runners/lighthouse/runner.ts
    - Move lighthouse-worker.ts to runners/lighthouse/worker.ts
    - Move lighthouse-capture.ts to runners/lighthouse/capture.ts
    - Create Lighthouse runner interface implementation
    - _Requirements: 4.1, 4.2_

  - [x] 5.2 Create measure runner module
    - Move measure-runner.ts to runners/measure/runner.ts
    - Move measure-types.ts to runners/measure/types.ts
    - Create measure runner interface implementation
    - _Requirements: 4.1, 4.2_

  - [ ] 5.3 Create specialized audit runners
    - Move accessibility.ts to runners/accessibility/index.ts
    - Move health-cli.ts to runners/health/index.ts
    - Move bundle-cli.ts to runners/bundle/index.ts
    - Move links-cli.ts to runners/links/index.ts
    - Move headers-cli.ts to runners/headers/index.ts
    - Move console-cli.ts to runners/console/index.ts
    - _Requirements: 4.1, 4.2_

  - [ ] 5.4 Implement runner registry system
    - Create central runner registry
    - Implement runner discovery and registration
    - Update core engine to use runner registry
    - _Requirements: 4.2, 4.3_

- [ ]* 5.5 Write property test for runner interface compliance
  - **Property 1: Module Isolation**
  - **Validates: Requirements 4.2, 4.3**

- [ ] 6. Migrate reporting module files
  - [ ] 6.1 Create report generators
    - Move runner-reporting.ts to reporting/generators/html.ts
    - Extract JSON generation to reporting/generators/json.ts
    - Create markdown generator for reporting/generators/markdown.ts
    - _Requirements: 5.1, 5.2_

  - [ ] 6.2 Create data formatters
    - Extract summary formatting to reporting/formatters/summary.ts
    - Move red-issues.ts to reporting/formatters/issues.ts
    - Create common formatter interfaces
    - _Requirements: 5.1, 5.2_

  - [ ] 6.3 Create artifact management
    - Move artifacts-navigation.ts to reporting/artifacts/navigation.ts
    - Create artifact storage utilities in reporting/artifacts/storage.ts
    - Implement artifact management interfaces
    - _Requirements: 5.1, 5.2_

  - [ ] 6.4 Create export functionality
    - Move build-export-bundle.ts to reporting/generators/export.ts
    - Move engine output files to reporting/generators/engine.ts
    - Create export service interfaces
    - _Requirements: 5.1, 5.2_

- [ ]* 6.5 Write property test for report format consistency
  - **Property 3: API Compatibility**
  - **Validates: Requirements 5.2, 5.3**

- [ ] 7. Migrate CLI module files
  - [ ] 7.1 Create CLI command structure
    - Move cli.ts to cli/commands/audit.ts
    - Move measure-cli.ts to cli/commands/measure.ts
    - Extract common CLI logic to cli/shared/
    - _Requirements: 3.1, 3.2_

  - [ ] 7.2 Create argument parsing system
    - Extract argument parsing to cli/args/parser.ts
    - Create validation utilities in cli/args/validation.ts
    - Implement command-specific argument handlers
    - _Requirements: 3.1, 3.2_

  - [ ] 7.3 Create interactive shell system
    - Extract shell functionality to cli/shell/shell.ts
    - Create command registration system in cli/shell/commands.ts
    - Implement shell command interfaces
    - _Requirements: 3.2, 3.3_

- [ ]* 7.4 Write property test for CLI command isolation
  - **Property 1: Module Isolation**
  - **Validates: Requirements 3.2, 8.1**

- [ ] 8. Update build system and imports
  - [ ] 8.1 Update TypeScript configuration
    - Configure path mapping for new module structure
    - Update tsconfig.json with module resolution
    - Set up build optimization for tree-shaking
    - _Requirements: 10.1, 10.2_

  - [ ] 8.2 Update all import statements
    - Replace relative imports with module-based imports
    - Update external API imports for compatibility
    - Ensure no circular dependencies exist
    - _Requirements: 8.2, 9.2_

  - [ ] 8.3 Create module index files
    - Implement proper re-exports in each module
    - Create main entry point with public API
    - Document public vs private module APIs
    - _Requirements: 8.1, 9.1_

- [ ]* 8.4 Write property test for dependency hierarchy
  - **Property 2: Dependency Hierarchy**
  - **Validates: Requirements 8.1, 8.2**

- [ ]* 8.5 Write property test for import path resolution
  - **Property 5: Import Path Resolution**
  - **Validates: Requirements 8.2, 10.4**

- [ ] 9. Checkpoint - Validate migration completeness
  - Ensure all tests pass with new module structure
  - Verify no broken imports or circular dependencies
  - Confirm all functionality works as expected
  - Ask the user if questions arise.

- [ ] 10. Update documentation and cleanup
  - [ ] 10.1 Update README and documentation
    - Document new module structure and architecture
    - Update developer setup instructions
    - Create module contribution guidelines
    - _Requirements: 9.4_

  - [ ] 10.2 Clean up legacy files and references
    - Remove old files after successful migration
    - Update package.json scripts if needed
    - Clean up any temporary migration artifacts
    - _Requirements: 9.1, 9.3_

  - [ ] 10.3 Create module development guidelines
    - Document module boundaries and responsibilities
    - Create templates for new modules and components
    - Establish coding standards for modular development
    - _Requirements: 1.2, 8.1_

- [ ] 11. Final checkpoint - Complete system validation
  - Run full test suite to ensure no regressions
  - Validate performance characteristics are maintained
  - Confirm all CLI commands work correctly
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- Tasks marked with `*` are optional and can be skipped for faster MVP
- Each task references specific requirements for traceability
- Checkpoints ensure incremental validation
- Property tests validate modular architecture correctness
- The migration maintains backward compatibility throughout the process