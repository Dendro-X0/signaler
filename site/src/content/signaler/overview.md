# Overview

Signaler is a comprehensive web quality platform designed for modern development teams. It combines industry-standard auditing tools with AI-powered insights to help you ship faster, accessible, and secure web applications.

## How it works

Signaler operates as a CLI tool that you can run locally or in your CI/CD pipeline.

1.  **Detection**: Signaler automatically detects your project framework (Next.js, Nuxt, etc.) and analyzes your directory structure to find routes.
2.  **Auditing**: It spins up headless Chrome instances to audit your pages against performance, accessibility, and best practices standards.
3.  **Reporting**: It generates detailed artifacts, including interactive HTML reports, JSON data, and AI-summarized insights.

## Core Components

-   **Performance**: Measures Core Web Vitals (LCP, CLS, INP) and other metrics using simulated throttling for consistent results.
-   **Accessibility**: Runs WCAG 2.1/2.2 compliance checks using the robust `axe-core` engine.
-   **Security**: Checks for OWASP vulnerabilities, security headers, and safe cookie attributes.
-   **SEO**: Validates meta tags, structured data, and content hierarchy.

## The Stack

Signaler is built with:

-   **Node.js & TypeScript**: For a robust and extensible auditing engine.
-   **Google Chrome**: For accurate, real-world rendering and performance measurement.
-   **AI Integration**: For processing complex audit data into actionable, human-readable advice.

## Next Steps

-   [Getting Started](./getting-started) - Install and run your first audit.
-   [CLI Reference](./cli) - Explore all available commands and flags.
-   [Configuration](./configuration) - Learn how to customize Signaler for your project.
