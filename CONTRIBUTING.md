# Contributing to Signaler

Thank you for your interest in contributing to Signaler! This guide will help you get started with development, testing, and contributing to the project.

## Getting Started

### Prerequisites

- **Node.js 18+** (required)
- **pnpm** (recommended package manager)
- **Git** for version control
- **TypeScript** knowledge for development

### Development Setup

1. **Clone the repository**:
   ```bash
   git clone https://github.com/signaler/signaler.git
   cd signaler
   ```

2. **Install dependencies**:
   ```bash
   pnpm install
   ```

3. **Build the project**:
   ```bash
   pnpm build
   ```

4. **Verify installation**:
   ```bash
   pnpm test:smoke
   ```

### Development Workflow

1. **Create a feature branch**:
   ```bash
   git checkout -b feature/your-feature-name
   ```

2. **Make your changes** following our coding standards

3. **Run tests** to ensure everything works:
   ```bash
   pnpm test:full
   ```

4. **Build and test** the complete package:
   ```bash
   pnpm build
   pnpm test:smoke
   ```

5. **Commit your changes** with a descriptive message

6. **Push and create a pull request**

## Testing Guidelines

### Our Testing Philosophy

Signaler uses a **dual testing approach** that combines:

- **Unit Tests**: Specific examples, edge cases, and error conditions
- **Property-Based Tests**: Universal properties across randomized inputs

Both types of tests are essential and complement each other for comprehensive coverage.

### Running Tests

```bash
# Run the complete test suite
pnpm test:full

# Run tests in watch mode during development
pnpm test:watch

# Run specific test files
pnpm test:full typescript-declaration-completeness.test.ts

# Run only property-based tests
pnpm test:full --grep "Property"

# Run with verbose output
pnpm test:full --reporter=verbose
```

### Writing Tests

#### When to Write Tests

**Always write tests when**:
- Adding new functionality
- Fixing bugs
- Modifying existing behavior
- Adding new API endpoints
- Changing configuration handling

#### Test Types to Write

1. **Property-Based Tests** for universal behaviors:
   ```typescript
   import fc from 'fast-check';
   
   it('should maintain property for all valid inputs', () => {
     // Feature: feature-name, Property N: Description
     // Validates: Requirements X.Y
     
     fc.assert(fc.property(
       fc.record({ /* input generators */ }),
       (input) => {
         // For any valid input, this should hold
         const result = functionUnderTest(input);
         return universalPropertyCheck(result);
       }
     ), { numRuns: 100 });
   });
   ```

2. **Unit Tests** for specific scenarios:
   ```typescript
   it('should handle specific scenario correctly', () => {
     // Arrange
     const input = createTestInput();
     
     // Act
     const result = functionUnderTest(input);
     
     // Assert
     expect(result).toEqual(expectedOutput);
   });
   ```

#### Property-Based Testing Guidelines

**Required Elements**:
- **Feature tag**: `Feature: feature-name, Property N: Description`
- **Requirements validation**: `Validates: Requirements X.Y, X.Z`
- **Minimum 100 iterations**: `{ numRuns: 100 }`
- **Universal quantification**: "For any..." statement in property

**Common Property Patterns**:
- **Round Trip**: `decode(encode(x)) == x`
- **Invariants**: Properties preserved after transformations
- **Idempotence**: `f(f(x)) == f(x)`
- **Metamorphic**: Relationships between inputs/outputs
- **Error Conditions**: Invalid inputs properly rejected

#### Unit Testing Guidelines

**Focus Areas**:
- Specific examples demonstrating correct behavior
- Edge cases and boundary conditions
- Error scenarios and their proper handling
- Integration points between components

**Test Structure**:
- **Arrange**: Set up test data and conditions
- **Act**: Execute the function under test
- **Assert**: Verify the expected outcome

### Test Development Best Practices

#### Do's ✅

- **Write tests first** or alongside implementation
- **Use descriptive test names** that explain what is being tested
- **Keep tests focused** on specific functionality
- **Link tests to requirements** for traceability
- **Use real data** instead of mocks when possible
- **Test both happy path and error conditions**
- **Run tests frequently** during development

#### Don'ts ❌

- **Don't over-test edge cases** - focus on core functionality
- **Don't use mocks** unless absolutely necessary
- **Don't write flaky tests** - ensure consistent results
- **Don't ignore failing tests** - fix or remove them
- **Don't skip property-based tests** for universal behaviors
- **Don't exceed 2 verification attempts** when fixing tests

### Test File Organization

```
test/
├── fixtures/                           # Test data and fixtures
├── component-name.test.ts              # Unit tests
├── property-name.test.ts               # Property-based tests
├── integration-name.test.ts            # Integration tests
└── README.md                           # Test documentation
```

### Debugging Tests

#### Common Issues

1. **Flaky Tests**:
   - Check for timing dependencies
   - Ensure proper test isolation
   - Review async operation handling

2. **Property Test Failures**:
   - Analyze counterexamples from fast-check
   - Determine if it's a test or implementation issue
   - Refine property definition if needed

3. **Timeout Issues**:
   - Review test complexity
   - Check for blocking operations
   - Consider increasing timeout for legitimate cases

#### Debugging Tools

```bash
# Verbose test output
pnpm test:full --reporter=verbose

# Run specific test file
pnpm test:full your-test-file.test.ts

# Debug with Node.js debugger
node --inspect-brk node_modules/.bin/vitest run your-test-file.test.ts
```

## Code Quality Standards

### TypeScript Guidelines

- **Use strict TypeScript**: Enable all strict mode options
- **Provide type annotations**: For public APIs and complex functions
- **Use interfaces**: For object shapes and contracts
- **Avoid `any`**: Use proper types or `unknown` when necessary
- **Export types**: Make types available for consumers

### Code Style

- **Use Prettier**: Code formatting is automated
- **Follow ESLint rules**: Linting rules are enforced
- **Use meaningful names**: Variables, functions, and classes should be descriptive
- **Keep functions small**: Single responsibility principle
- **Document public APIs**: Use JSDoc comments for exported functions

### Documentation Requirements

- **Update README**: If adding new features or changing behavior
- **Add JSDoc comments**: For all public APIs
- **Update type definitions**: Ensure TypeScript declarations are current
- **Include examples**: For new functionality
- **Update CHANGELOG**: Document breaking changes and new features

## Pull Request Process

### Before Submitting

1. **Run the full test suite**:
   ```bash
   pnpm test:full
   ```

2. **Build successfully**:
   ```bash
   pnpm build
   ```

3. **Test the built package**:
   ```bash
   pnpm test:smoke
   ```

4. **Update documentation** if needed

5. **Add tests** for new functionality

### Pull Request Guidelines

- **Descriptive title**: Clearly describe what the PR does
- **Detailed description**: Explain the changes and why they're needed
- **Link issues**: Reference related issues or requirements
- **Include tests**: All new functionality must have tests
- **Update documentation**: Keep docs current with changes
- **Small, focused changes**: Easier to review and merge

### Review Process

1. **Automated checks**: Tests and builds must pass
2. **Code review**: Maintainers will review your changes
3. **Address feedback**: Make requested changes promptly
4. **Final approval**: Maintainer approval required for merge

## Development Tips

### Local Development

```bash
# Watch mode for development
pnpm dev

# Test your changes
pnpm test:full

# Build and test package
pnpm build && pnpm test:smoke
```

### Testing New Features

1. **Write property-based tests** for universal behaviors
2. **Add unit tests** for specific scenarios
3. **Test edge cases** and error conditions
4. **Verify integration** with existing functionality
5. **Update documentation** with examples

### Performance Considerations

- **Profile test execution**: Keep tests fast
- **Optimize property test generators**: Efficient input generation
- **Monitor memory usage**: Especially for large test suites
- **Use appropriate test timeouts**: Balance thoroughness with speed

## Getting Help

### Resources

- **[Testing Documentation](docs/testing.md)**: Comprehensive testing guide
- **[API Reference](docs/api-reference.md)**: Complete API documentation
- **[Configuration Guide](docs/configuration-and-routes.md)**: Configuration patterns

### Community

- **GitHub Issues**: Report bugs or request features
- **GitHub Discussions**: Ask questions or discuss ideas
- **Pull Requests**: Contribute code improvements

### Maintainer Contact

For questions about contributing:
- **Create an issue**: For bugs or feature requests
- **Start a discussion**: For general questions
- **Email**: team@signaler.dev for private matters

## Recognition

Contributors are recognized in:
- **CHANGELOG.md**: Major contributions noted in release notes
- **README.md**: Contributors section (for significant contributions)
- **GitHub**: Contributor graphs and statistics

Thank you for contributing to Signaler! Your efforts help make web performance monitoring better for everyone.