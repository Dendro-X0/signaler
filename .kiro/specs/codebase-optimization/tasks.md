# Implementation Plan: Codebase Optimization

## Overview

This plan transforms Signaler from an over-engineered tool with 80+ files and 19 commands into a focused, maintainable tool with 5 files and 1 command. The approach is radical simplification - removing everything that doesn't directly contribute to the core value of running Lighthouse audits on multiple pages.

## Tasks

- [x] 1. Create simplified core architecture
  - Create new simplified file structure (5 files maximum)
  - Implement minimal configuration loading
  - Set up basic TypeScript build configuration
  - _Requirements: 5.3, 2.3_

- [x] 1.1 Write property test for dependency count

  - **Property 1: Dependency Count Reduction**
  - **Validates: Requirements 1.1, 1.2, 1.3, 1.5**

- [x] 2. Implement core Lighthouse integration
  - [x] 2.1 Create simplified Lighthouse runner
    - Extract essential Lighthouse execution logic
    - Remove complex parallel execution framework
    - Implement simple sequential or basic parallel execution
    - _Requirements: 3.1, 6.1_

  - [ ]* 2.2 Write property test for core functionality preservation
    - **Property 5: Core Functionality Preservation**
    - **Validates: Requirements 2.4, 1.5**

  - [x] 2.3 Implement basic configuration system
    - Create simple JSON configuration loading
    - Support essential fields only (baseUrl, pages, basic options)
    - Provide sensible defaults for all optional settings
    - _Requirements: 6.3, 4.2_

  - [ ]* 2.4 Write property test for zero-config operation
    - **Property 7: Zero-Config Operation**
    - **Validates: Requirements 4.2, 6.3**

- [x] 3. Create focused report generation
  - [x] 3.1 Implement single HTML report format
    - Generate clean, actionable HTML reports
    - Include summary table and individual page results
    - Focus on essential metrics and scores only
    - _Requirements: 6.2_

  - [ ]* 3.2 Write property test for report conciseness
    - **Property 12: Report Conciseness**
    - **Validates: Requirements 6.2**

  - [x] 3.3 Remove all other output formats
    - Delete JSON, Markdown, and other report generators
    - Consolidate into single excellent format
    - _Requirements: 3.2_

- [x] 4. Simplify command interface
  - [x] 4.1 Implement single command entry point
    - Replace complex CLI routing with simple argument parsing
    - Support only essential command-line options
    - Remove all auxiliary commands (measure, bundle, health, etc.)
    - _Requirements: 3.2, 3.3_

  - [ ]* 4.2 Write property test for command simplification
    - **Property 6: Command Simplification**
    - **Validates: Requirements 3.1, 3.2, 3.3**

  - [x] 4.3 Implement clear error handling
    - Replace complex error recovery with simple, clear error messages
    - Provide actionable guidance for common issues
    - Fail fast with helpful information
    - _Requirements: 4.3, 6.4_

  - [ ]* 4.4 Write property test for error message clarity
    - **Property 8: Error Message Clarity**
    - **Validates: Requirements 4.3, 6.4**

- [x] 5. Checkpoint - Test simplified core functionality
  - Ensure basic audit workflow works end-to-end
  - Verify configuration loading and report generation
  - Test error handling for common failure cases
  - Ask the user if questions arise

- [x] 6. Remove unnecessary code and dependencies
  - [x] 6.1 Delete unused command implementations
    - Remove measure-cli.ts, bundle-cli.ts, health-cli.ts, etc.
    - Delete shell-cli.ts and interactive mode
    - Remove wizard-cli.ts and setup wizards
    - _Requirements: 3.2_

  - [x] 6.2 Delete complex infrastructure code
    - Remove src/infrastructure/ directory entirely
    - Delete src/ui/ complex terminal UI components
    - Remove src/reporting/ multiple format generators
    - _Requirements: 2.1, 2.3_

  - [x] 6.3 Simplify dependency list
    - Remove ws (WebSocket) dependency
    - Keep only lighthouse, chrome-launcher, and essential utilities
    - Update package.json to reflect minimal dependencies
    - _Requirements: 1.1, 1.3_

  - [ ]* 6.4 Write property test for bundle size optimization
    - **Property 2: Bundle Size Optimization**
    - **Validates: Requirements 1.3**

- [x] 7. Verify installation and execution simplicity
  - [x] 7.1 Test installation in clean environments
    - Verify installation works with only Node.js prerequisite
    - Test in different operating systems and Node versions
    - Ensure no additional system dependencies required
    - _Requirements: 4.1, 1.4_

  - [ ]* 7.2 Write property test for installation reliability
    - **Property 3: Installation Reliability**
    - **Validates: Requirements 1.4, 4.1**

  - [x] 7.3 Test self-contained execution
    - Verify audits complete without external tools
    - Test with minimal configuration
    - Ensure reasonable performance for basic use cases
    - _Requirements: 4.5, 6.1_

  - [ ]* 7.4 Write property test for self-contained execution
    - **Property 9: Self-Contained Execution**
    - **Validates: Requirements 4.5**

- [x] 8. Measure and validate simplification goals
  - [x] 8.1 Measure code reduction metrics
    - Count total lines of TypeScript code
    - Verify ≤ 500 lines target is met
    - Document file count reduction (80+ → 5)
    - _Requirements: 2.5_

  - [ ]* 8.2 Write property test for code size reduction
    - **Property 4: Code Size Reduction**
    - **Validates: Requirements 2.1, 2.3, 2.5**

  - [x] 8.3 Validate maintainability improvements
    - Measure cyclomatic complexity
    - Verify code organization and separation of concerns
    - Test that changes are easy to understand and implement
    - _Requirements: 7.5_

  - [ ]* 8.4 Write property test for maintainability metrics
    - **Property 13: Maintainability Metrics**
    - **Validates: Requirements 7.5**

- [x] 9. Update documentation and distribution
  - [x] 9.1 Rewrite README for simplified tool
    - Focus on clear value proposition
    - Provide simple installation and usage instructions
    - Remove documentation for removed features
    - _Requirements: 8.1, 8.2_

  - [x] 9.2 Update package.json and build configuration
    - Reflect simplified command structure
    - Update dependencies list
    - Ensure build process works with new structure
    - _Requirements: 1.2_

  - [x] 9.3 Test and validate distribution
    - Ensure portable ZIP creation works with simplified structure
    - Test installation scripts with new minimal dependencies
    - Verify the tool provides clear value in simplified form
    - _Requirements: 4.1, 6.5_

- [x] 10. Final checkpoint - Validate simplified tool
  - Run complete audit workflow with simplified version
  - Compare results with original version to ensure equivalence
  - Verify all simplification goals are met
  - Document what was removed and why
  - Ask the user if questions arise

## Notes

- Tasks marked with `*` are optional property-based tests that validate the simplification goals
- Each task references specific requirements for traceability
- The approach is radical: remove first, optimize later
- Success is measured by both what's removed and what's preserved
- If the simplified version doesn't provide clear value, that's a valid outcome that suggests the tool may not be necessary

## Success Criteria

**Quantitative Goals:**
- ≤ 5 TypeScript files (down from 80+)
- ≤ 1 command (down from 19)
- ≤ 500 lines of code (down from 3000+)
- ≤ 3 runtime dependencies (down from 4)
- Installation time < 30 seconds
- Basic audit completion < 2 minutes

**Qualitative Goals:**
- Clear, obvious value proposition
- Simple mental model for users
- Easy to contribute to and maintain
- Reliable installation across environments
- Focused, one-page documentation