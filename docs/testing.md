# Testing Documentation

## Overview

Signaler employs a comprehensive testing strategy that combines traditional unit testing with property-based testing (PBT) to ensure robust code quality and correctness. Our testing approach is designed to catch both specific edge cases and universal behavioral properties across the entire codebase.

## Testing Strategy

### Dual Testing Approach

We use a **dual testing approach** that combines:

1. **Unit Tests**: Verify specific examples, edge cases, and error conditions
2. **Property-Based Tests**: Verify universal properties across all inputs

Both testing approaches are complementary and necessary for comprehensive coverage:
- **Unit tests** catch concrete bugs and validate specific behaviors
- **Property tests** verify general correctness across a wide range of inputs

### Testing Philosophy

Our testing philosophy is built on these core principles:

- **Correctness First**: Every feature must have corresponding tests that validate its correctness
- **Property-Based Validation**: Universal properties are tested across randomized inputs
- **Minimal but Comprehensive**: Focus on core functional logic without over-testing edge cases
- **Real-World Testing**: Tests validate actual functionality without mocks or fake data
- **Continuous Validation**: Tests run automatically on every change

## Property-Based Testing (PBT)

### What is Property-Based Testing?

Property-based testing validates software correctness by testing universal properties across many generated inputs. Each property is a formal specification that should hold for all valid inputs.

### Core PBT Principles

1. **Universal Quantification**: Every property contains an explicit "for all" statement
2. **Requirements Traceability**: Each property references the requirements it validates
3. **Executable Specifications**: Properties are implementable as automated tests
4. **Comprehensive Coverage**: Properties cover all testable acceptance criteria

### Common Property Patterns

Our property-based tests follow these established patterns:

#### 1. Invariants
Properties that remain constant despite changes to structure or order:
- Collection size after map operations
- Tree balance after insertions
- Object state consistency

#### 2. Round Trip Properties
Operations combined with their inverse return to original value:
- Serialization/deserialization: `decode(encode(x)) == x`
- Parse/format operations: `parse(format(x)) == x`
- Configuration save/load cycles

#### 3. Idempotence
Operations where doing it twice equals doing it once:
- Duplicate filtering: `distinct(distinct(x)) == distinct(x)`
- Configuration normalization
- Cache operations

#### 4. Metamorphic Properties
Relationships that must hold between components:
- Filter results are subsets: `len(filter(x)) <= len(x)`
- Sorted results maintain content: `sort(x).content == x.content`

#### 5. Error Conditions
Generated bad inputs ensure proper error signaling:
- Invalid configuration handling
- Malformed input rejection
- Boundary condition validation

### Property Test Configuration

All property-based tests in Signaler follow these standards:

- **Minimum 100 iterations** per property test (due to randomization)
- **Tagged with design property reference**: `Feature: jsr-score-optimization, Property {number}: {property_text}`
- **Requirements validation**: Each property must reference specific requirements
- **Fast-check library**: We use `fast-check` for property-based testing in TypeScript

### Example Property Test

```typescript
import fc from 'fast-check';
import { describe, it } from 'vitest';

describe('TypeScript Declaration Completeness', () => {
  it('should have valid type declarations for all exports', () => {
    // Feature: jsr-score-optimization, Property 1: TypeScript Declaration Completeness
    // Validates: Requirements 1.1, 1.2, 1.3, 1.5
    
    fc.assert(fc.property(
      fc.array(fc.string()),
      (exportNames) => {
        // For any exported module, there should exist corresponding TypeScript declarations
        const hasValidDeclarations = exportNames.every(name => 
          validateTypeDeclaration(name)
        );
        return hasValidDeclarations;
      }
    ), { numRuns: 100 });
  });
});
```

## Unit Testing

### Unit Test Guidelines

Unit tests complement property-based tests by focusing on:

- **Specific Examples**: Concrete scenarios that demonstrate correct behavior
- **Edge Cases**: Boundary conditions and special cases
- **Error Conditions**: Specific error scenarios and their handling
- **Integration Points**: How components interact with each other

### Unit Test Structure

```typescript
import { describe, it, expect } from 'vitest';

describe('Component Name', () => {
  it('should handle specific scenario correctly', () => {
    // Arrange
    const input = createTestInput();
    
    // Act
    const result = functionUnderTest(input);
    
    // Assert
    expect(result).toEqual(expectedOutput);
  });
  
  it('should handle edge case appropriately', () => {
    // Test specific edge case
  });
  
  it('should throw error for invalid input', () => {
    // Test error conditions
  });
});
```

## Test Organization

### Directory Structure

```
test/
├── fixtures/                    # Test data and fixtures
├── *.test.ts                   # Individual test files
└── README.md                   # Test-specific documentation
```

### Test File Naming

- **Unit tests**: `component-name.test.ts`
- **Property-based tests**: `property-name.test.ts`
- **Integration tests**: `integration-name.test.ts`

### Test Categories

Our tests are organized into these categories:

1. **Core Functionality Tests**
   - API functionality
   - Configuration handling
   - Route detection
   - Report generation

2. **Property-Based Tests**
   - TypeScript declaration completeness
   - Package metadata completeness
   - API documentation coverage
   - Example coverage consistency
   - Export type safety
   - Publication optimization

3. **Integration Tests**
   - End-to-end workflows
   - CLI command execution
   - File system operations
   - External service integration

4. **Performance Tests**
   - Memory optimization
   - Parallel execution performance
   - Large dataset handling

## Running Tests

### Basic Test Commands

```bash
# Run all tests (full suite)
pnpm test:full

# Run tests in watch mode during development
pnpm test:watch

# Run specific test file
pnpm test:full typescript-declaration-completeness.test.ts

# Run tests with coverage
pnpm test:coverage
```

### Test Environment Setup

Tests run in a Node.js environment with these configurations:
- **Timeout**: 30 seconds for individual tests
- **Hook Timeout**: 10 seconds for setup/teardown
- **Environment**: Node.js (not browser)
- **Globals**: Vitest globals enabled

### Property-Based Test Execution

Property-based tests require special consideration:

```bash
# Run property-based tests (may take longer due to 100+ iterations)
pnpm test:full --grep "Property"

# Run with verbose output to see property test progress
pnpm test:full --reporter=verbose
```

## Test Coverage and Quality Metrics

### Coverage Targets

We maintain these coverage targets:

- **Line Coverage**: 80%+ for core functionality
- **Branch Coverage**: 75%+ for decision points
- **Function Coverage**: 90%+ for public APIs
- **Property Coverage**: 100% for all defined correctness properties

### Quality Indicators

Our test suite includes these quality indicators:

- **Test Count**: Total number of tests across all categories
- **Property Test Count**: Number of property-based tests
- **Coverage Percentage**: Code coverage metrics
- **Test Execution Time**: Performance of test suite
- **Flaky Test Detection**: Identification of unstable tests

### Continuous Integration

Tests run automatically on:
- **Every commit**: Full test suite execution
- **Pull requests**: Complete validation before merge
- **Releases**: Comprehensive testing before publication
- **Scheduled runs**: Regular validation of main branch

## Contributing to Tests

### Adding New Tests

When adding new functionality:

1. **Identify Properties**: Determine what universal properties should hold
2. **Write Property Tests**: Create property-based tests for universal behaviors
3. **Add Unit Tests**: Create specific tests for edge cases and examples
4. **Update Documentation**: Document new testing patterns or requirements

### Test Development Guidelines

- **Test First**: Write tests before or alongside implementation
- **Property Focus**: Prefer property-based tests for universal behaviors
- **Minimal Scope**: Keep tests focused on specific functionality
- **Clear Naming**: Use descriptive test names that explain what is being tested
- **Requirements Traceability**: Link tests to specific requirements

### Property Test Development

When creating property-based tests:

1. **Identify the Property**: What universal rule should always hold?
2. **Define Input Space**: What are valid inputs for this property?
3. **Create Generators**: Use fast-check to generate test inputs
4. **Implement Assertion**: Write the property check logic
5. **Add Metadata**: Include feature name and requirement validation

### Example Property Test Template

```typescript
import fc from 'fast-check';
import { describe, it } from 'vitest';

describe('Feature Name - Property Testing', () => {
  it('should maintain [property description] for all valid inputs', () => {
    // Feature: feature-name, Property N: [Property Description]
    // Validates: Requirements X.Y, X.Z
    
    fc.assert(fc.property(
      fc.record({
        // Define input generators
        field1: fc.string(),
        field2: fc.integer(),
      }),
      (input) => {
        // For any valid input, this property should hold
        const result = functionUnderTest(input);
        return propertyAssertion(result, input);
      }
    ), { 
      numRuns: 100,
      verbose: true 
    });
  });
});
```

## Debugging Tests

### Common Test Issues

1. **Flaky Tests**: Tests that pass/fail inconsistently
   - Check for timing dependencies
   - Verify test isolation
   - Review async operation handling

2. **Property Test Failures**: Property-based tests finding counterexamples
   - Analyze the counterexample provided by fast-check
   - Determine if it's a test issue or implementation bug
   - Refine property definition if needed

3. **Timeout Issues**: Tests exceeding time limits
   - Review test complexity
   - Check for infinite loops or blocking operations
   - Consider increasing timeout for legitimate long-running tests

### Test Debugging Tools

- **Vitest Reporter**: Use `--reporter=verbose` for detailed output
- **Fast-check Verbose**: Enable verbose mode for property test details
- **Test Isolation**: Run individual tests to isolate issues
- **Debug Mode**: Use Node.js debugging with test files

## Test Maintenance

### Regular Maintenance Tasks

- **Review Test Coverage**: Ensure coverage targets are met
- **Update Property Tests**: Refine properties as requirements evolve
- **Performance Monitoring**: Track test execution time trends
- **Flaky Test Resolution**: Address unstable tests promptly

### Test Refactoring

When refactoring tests:
- **Maintain Property Coverage**: Ensure all properties remain tested
- **Update Requirements Links**: Keep requirement validation current
- **Preserve Test Intent**: Maintain the original testing purpose
- **Document Changes**: Update test documentation as needed

## Resources

### Testing Libraries

- **[Vitest](https://vitest.dev/)**: Our primary testing framework
- **[Fast-check](https://fast-check.dev/)**: Property-based testing library
- **[@types/node](https://www.npmjs.com/package/@types/node)**: TypeScript definitions for Node.js

### Further Reading

- **[Property-Based Testing Guide](https://fast-check.dev/docs/introduction/)**: Comprehensive PBT introduction
- **[Vitest Documentation](https://vitest.dev/guide/)**: Complete testing framework guide
- **[Testing Best Practices](https://github.com/goldbergyoni/javascript-testing-best-practices)**: Industry testing standards

### Internal Documentation

- **[API Reference](api-reference.md)**: Complete API documentation
- **[Configuration Guide](configuration-and-routes.md)**: Configuration testing patterns
- **[Contributing Guide](../CONTRIBUTING.md)**: General contribution guidelines