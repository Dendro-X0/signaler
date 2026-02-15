# Signaler Development Guide

This document provides a comprehensive overview of the Signaler project's technical architecture, development workflow, and key features. It is intended for new contributors and maintainers.

## Project Overview

**Signaler** is an enterprise-grade web quality platform designed to provide a 360° view of web application health. It combines industry-standard auditing tools with AI-powered insights to analyze:

*   **Performance**: Core Web Vitals (LCP, CLS, INP).
*   **Accessibility**: WCAG 2.1/2.2 compliance via axe-core.
*   **Security**: OWASP Top 10 vulnerabilities.
*   **SEO**: Search engine optimization best practices.

## Technical Architecture

The project is structured as a monorepo containing three primary components:

### 1. The Engine (`src/`)
The core auditing logic is written in **Node.js** and **TypeScript**. It orchestrates the execution of various auditing tools.

*   **Stack**: Node.js 18+, TypeScript 5.9+.
*   **Key Dependencies**:
    *   `lighthouse`: For performance and SEO audits.
    *   `axe-core`: For accessibility compliance.
    *   `playwright`: For browser automation and simulating user flows.
    *   `chrome-launcher`: For headless Chrome management.
*   **Artifacts**: Generates JSON/HTML reports in the `.signaler/` directory.

### 2. The Launcher (`apex-auditor/launcher/`)
A **Rust**-based binary that serves as the entry point for system-level operations.

*   **Purpose**: Environment validation, process orchestration, and parallel execution management.
*   **Integration**: Invokes the Node.js engine for actual auditing tasks.

### 3. The Documentation Site (`site/`)
A modern, high-performance documentation portal built with **Next.js**.

*   **Stack**: Next.js 14+ (App Router), React, Tailwind CSS.
*   **UI Libraries**:
    *   `shadcn/ui`: For accessible, reusable components.
    *   `framer-motion`: For complex animations (Hero Aurora effect).
    *   `tsparticles`: For the interactive background lattice.
    *   `lucide-react`: For iconography.
*   **Deployment**: Hosted on Netlify with automated builds (`pnpm build`).

### 4. Cortex (AI Engine)
The **AI integration layer** ("Signaler Cortex") enables intelligent analysis and remediation.

*   **Location**: `src/cortex/`
*   **Providers**:
    *   **OpenAI**: GPT-4o, etc. (via `@ai-sdk/openai`)
    *   **Anthropic**: Claude 3.5 Sonnet (via `@ai-sdk/anthropic`)
    *   **Local**: Ollama or compatible endpoints (via generic adapter)
*   **Configuration**: managed via `.signalerrc` or environment variables, loaded by `src/cortex/config.ts`.

## Development Workflow

### Prerequisites
*   **Node.js**: v18.0.0 or higher.
*   **Package Manager**: `pnpm` is strictly required for workspace management.

### Setup
1.  **Install Dependencies**:
    ```bash
    pnpm install
    ```

### Running the Engine (CLI)
To develop the core engine logic:
```bash
# Run the CLI from source
pnpm dev -- <command>

# Example: Run the wizard
pnpm dev -- wizard

# Example: Run a full audit
pnpm dev -- audit --url https://example.com
```

### Running the Documentation Site
To work on the `site/` directory:
```bash
cd site
pnpm dev
# Site available at http://localhost:3000
```

### Testing
We use **Vitest** for unit and integration testing.
```bash
# Run full test suite
pnpm run test:full

# Run coverage report
pnpm run test:coverage
```

## Release Process

### CLI / Engine
The CLI is distributed via **JSR** (JavaScript Registry) for optimized delivery.
```bash
# Prepare and publish to JSR
pnpm run prepare:jsr
./publish-jsr.sh
```

### Documentation Site
The site is automatically deployed to **Netlify** upon pushing to the `main` branch.
*   **Build Command**: `pnpm build`
*   **Publish Directory**: `.next`

## Project Structure

```
signaler/
├── dist/                   # Compiled engine output
├── docs/                   # Markdown documentation source files
├── scripts/                # Build and utility scripts
├── site/                   # Next.js documentation application
│   ├── public/             # Static assets (images, SVGs)
│   ├── src/
│   │   ├── app/            # Next.js App Router pages
│   │   ├── components/     # React UI components
│   │   ├── content/        # Site-specific markdown content
│   │   └── lib/            # Utilities and hooks
│   └── netlify.toml        # Netlify deployment config
├── src/                    # Core Engine source code
│   ├── audits/             # Individual audit implementations
│   ├── cortex/             # AI Integration Layer (Providers, Config)
│   ├── bin.ts              # CLI entry point
│   └── index.ts            # Library exports
├── jsr.json                # JSR package configuration
├── package.json            # Root package configuration
├── tsconfig.json           # TypeScript configuration
└── vitest.config.ts        # Test runner configuration
```
