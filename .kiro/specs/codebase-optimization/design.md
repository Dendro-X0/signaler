# Design Document

## Overview

Signaler has grown from a simple Lighthouse wrapper into a complex, over-engineered tool with 19 commands, 80+ files, and feature bloat that obscures its core value. This design focuses on radical simplification - reducing the tool to its essential function: running Lighthouse audits on multiple pages and generating useful reports.

The simplified version will be a single-purpose tool that does one thing exceptionally well, rather than many things poorly.

## Architecture

### Current State Analysis

**Problems with Current Architecture:**
- 19 different commands when most users only need `audit`
- Complex directory structure with unnecessary abstraction layers
- Over-engineered CLI parsing and command routing
- Separate modules for tangential features (bundle analysis, health checks, etc.)
- Complex configuration system with too many options
- Multiple output formats and reporting mechanisms

**What Actually Provides Value:**
1. **Core Lighthouse Integration**: Running Lighthouse audits programmatically
2. **Multi-page Support**: Auditing multiple URLs in a single run
3. **Structured Output**: Generating readable reports from audit results
4. **Basic Configuration**: Simple way to specify URLs and options

### Simplified Architecture

```
signaler/
├── src/
│   ├── index.ts          # Main entry point
│   ├── config.ts         # Simple configuration loading
│   ├── lighthouse.ts     # Lighthouse runner
│   ├── report.ts         # Report generation
│   └── types.ts          # Core types only
├── package.json          # Minimal dependencies
└── README.md            # Clear, focused documentation
```

**Key Architectural Decisions:**
1. **Single Command**: Only `signaler audit` (or just `signaler`)
2. **Minimal Dependencies**: Keep only lighthouse, chrome-launcher, and essential utilities
3. **Simple Configuration**: Basic JSON config with sensible defaults
4. **Single Output Format**: Focus on one excellent report format
5. **No CLI Framework**: Direct argument parsing, no complex routing

## Components and Interfaces

### Core Components

#### 1. Configuration Loader (`config.ts`)
```typescript
interface SignalerConfig {
  baseUrl: string;
  pages: Array<{
    path: string;
    label?: string;
  }>;
  options?: {
    device?: 'mobile' | 'desktop';
    parallel?: number;
  };
}

function loadConfig(path?: string): SignalerConfig
```

**Responsibilities:**
- Load configuration from `signaler.json` or command line
- Provide sensible defaults
- Validate required fields only

#### 2. Lighthouse Runner (`lighthouse.ts`)
```typescript
interface AuditResult {
  url: string;
  label: string;
  scores: {
    performance: number;
    accessibility: number;
    bestPractices: number;
    seo: number;
  };
  metrics: {
    lcp: number;
    fcp: number;
    cls: number;
  };
}

function runAudits(config: SignalerConfig): Promise<AuditResult[]>
```

**Responsibilities:**
- Launch Chrome and run Lighthouse audits
- Handle parallel execution (simple implementation)
- Extract essential metrics and scores
- Return structured results

#### 3. Report Generator (`report.ts`)
```typescript
function generateReport(results: AuditResult[], outputDir: string): Promise<void>
```

**Responsibilities:**
- Generate a single, excellent HTML report
- Include summary table and individual page results
- Provide actionable insights
- Save to predictable location

#### 4. Main Entry Point (`index.ts`)
```typescript
async function main(args: string[]): Promise<void>
```

**Responsibilities:**
- Parse command line arguments (simple)
- Load configuration
- Run audits
- Generate report
- Handle errors gracefully

### Data Models

#### Simplified Configuration
```json
{
  "baseUrl": "https://example.com",
  "pages": [
    { "path": "/", "label": "Home" },
    { "path": "/about", "label": "About" },
    { "path": "/contact", "label": "Contact" }
  ],
  "options": {
    "device": "mobile",
    "parallel": 2
  }
}
```

#### Audit Results
```typescript
interface AuditSummary {
  timestamp: string;
  baseUrl: string;
  totalPages: number;
  averageScores: {
    performance: number;
    accessibility: number;
    bestPractices: number;
    seo: number;
  };
  results: AuditResult[];
}
```

## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system-essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*

### Property Analysis

Based on the prework analysis, here are the testable correctness properties for the simplified Signaler:

**Property 1: Dependency Count Reduction**
*For any* optimized version of Signaler, the number of runtime dependencies should be ≤ 5 packages while maintaining core functionality
**Validates: Requirements 1.1, 1.2, 1.3, 1.5**

**Property 2: Bundle Size Optimization**
*For any* dependency replacement, the total installed package size should decrease compared to the previous version
**Validates: Requirements 1.3**

**Property 3: Installation Reliability**
*For any* clean Node.js environment, Signaler should install successfully without additional system dependencies
**Validates: Requirements 1.4, 4.1**

**Property 4: Code Size Reduction**
*For any* refactored version of Signaler, the total lines of TypeScript code should be ≤ 500 lines
**Validates: Requirements 2.1, 2.3, 2.5**

**Property 5: Core Functionality Preservation**
*For any* valid audit configuration, the simplified version should produce equivalent audit results to the original version
**Validates: Requirements 2.4, 1.5**

**Property 6: Command Simplification**
*For any* user interaction with Signaler, only Lighthouse auditing commands should be available
**Validates: Requirements 3.1, 3.2, 3.3**

**Property 7: Zero-Config Operation**
*For any* first-time execution with minimal configuration, Signaler should successfully complete an audit
**Validates: Requirements 4.2, 6.3**

**Property 8: Error Message Clarity**
*For any* error condition, Signaler should provide actionable error messages that help users resolve the issue
**Validates: Requirements 4.3, 6.4**

**Property 9: Self-Contained Execution**
*For any* audit run, Signaler should complete without requiring external tools beyond Node.js and Chrome
**Validates: Requirements 4.5**

**Property 10: Core Logic Separation**
*For any* code organization, audit functionality should be clearly separated from auxiliary features
**Validates: Requirements 5.3**

**Property 11: Audit Performance**
*For any* audit execution, the time to complete should be reasonable (≤ 2 minutes for basic multi-page audit)
**Validates: Requirements 6.1**

**Property 12: Report Conciseness**
*For any* generated report, it should contain essential audit information without excessive detail
**Validates: Requirements 6.2**

**Property 13: Maintainability Metrics**
*For any* code complexity measurement, the simplified version should have low cyclomatic complexity and high maintainability scores
**Validates: Requirements 7.5**

## Error Handling

### Simplified Error Strategy

**Principle**: Fail fast with clear, actionable error messages.

#### Error Categories
1. **Configuration Errors**: Missing baseUrl, invalid JSON, etc.
2. **Network Errors**: Cannot reach baseUrl, timeout issues
3. **Chrome/Lighthouse Errors**: Browser launch failures, audit crashes
4. **File System Errors**: Cannot write reports, permission issues

#### Error Handling Approach
```typescript
// Simple, direct error handling
try {
  const config = loadConfig();
  const results = await runAudits(config);
  await generateReport(results);
  console.log('✅ Audit complete! Report saved to ./signaler-report.html');
} catch (error) {
  console.error('❌ Signaler failed:', error.message);
  process.exit(1);
}
```

**No Complex Error Recovery**: If something fails, show a clear error and exit. Don't try to be clever.

## Testing Strategy

### Dual Testing Approach

**Unit Tests**: Focus on core logic with simple, direct tests
- Configuration loading and validation
- Lighthouse result parsing
- Report generation with known inputs
- Error handling for common failure cases

**Property Tests**: Verify universal properties across inputs
- **Property 1**: Dependency count validation
- **Property 2**: Code size measurement
- **Property 3**: Single-purpose verification
- **Property 4**: Installation simplicity testing
- **Property 5**: Core functionality preservation
- **Property 6**: Value delivery verification
- **Property 7**: Maintainability assessment
- **Property 8**: Value proposition clarity

### Testing Configuration
- **Property-based testing library**: fast-check
- **Minimum iterations**: 100 per property test
- **Test tagging**: Each property test references its design document property
- **Tag format**: `Feature: codebase-optimization, Property {number}: {property_text}`

### Removal Strategy

#### Phase 1: Command Elimination
**Remove these commands entirely:**
- `measure`, `bundle`, `health`, `links`, `headers`, `console` (separate tools exist for these)
- `clean`, `uninstall`, `clear-screenshots` (unnecessary maintenance commands)
- `upgrade` (use standard package managers)
- `wizard`, `quickstart`, `guide` (over-engineered setup)
- `shell` (interactive mode adds complexity)
- `quick`, `report`, `folder` (consolidate into main audit)

**Keep only:**
- `audit` (rename to default behavior)

#### Phase 2: File Structure Simplification
**Remove entire directories:**
- `src/cli/` (complex CLI framework)
- `src/infrastructure/` (over-abstracted utilities)
- `src/reporting/` (multiple report formats)
- `src/runners/` (except lighthouse)
- `src/ui/` (complex terminal UI)

**Consolidate into 5 files maximum:**
- `src/index.ts` (main entry)
- `src/config.ts` (configuration)
- `src/lighthouse.ts` (audit runner)
- `src/report.ts` (report generation)
- `src/types.ts` (essential types)

#### Phase 3: Feature Reduction
**Remove these features:**
- Multiple output formats (keep only HTML)
- Complex parallel execution (simple implementation)
- Incremental caching (adds complexity)
- Webhook notifications (external concern)
- Budget validation (separate tool)
- Accessibility sweeps (use dedicated tools)
- Screenshot capture (optional in Lighthouse)
- Multiple device types (pick one default)

#### Phase 4: Dependency Cleanup
**Target dependency list:**
- `lighthouse` (core functionality)
- `chrome-launcher` (browser management)
- `prompts` (if needed for minimal interaction)

**Remove:**
- `ws` (WebSocket complexity)
- Any dev dependencies not essential for building

### Success Metrics

**Quantitative Goals:**
- Reduce from 80+ files to ≤ 5 files
- Reduce from 19 commands to 1 command
- Reduce from ~3000+ lines to ≤ 500 lines
- Reduce runtime dependencies to ≤ 3 packages
- Installation time < 30 seconds
- First audit run < 2 minutes

**Qualitative Goals:**
- Clear, obvious value proposition
- Simple mental model for users
- Easy to contribute to and maintain
- Reliable installation across environments
- Focused documentation (1-page README)

This simplified version will either prove its value through focused excellence or reveal that the tool isn't necessary - both are valuable outcomes.