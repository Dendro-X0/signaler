# Signaler CLI

> Comprehensive web quality platform with AI-powered insights, accessibility, security, and performance audits.

![Version](https://img.shields.io/badge/version-2.5.0-blue.svg)
![License](https://img.shields.io/badge/license-MIT-green.svg)

## 🚀 Quick Start

Get started instantly without global installation using JSR:

```bash
# Run immediately
npx jsr run @signaler/cli audit

# Or add to your project
npx jsr add @signaler/cli
```

Once installed, use the CLI:

```bash
# Start the interactive wizard
npx signaler wizard

# Run a standard audit
npx signaler audit

# Get help
npx signaler --help
```

## ✨ Features

*   **⚡ Performance**: Deep audits for Web Vitals, images, fonts, and bundles.
*   **♿ Accessibility**: Automated checks using `axe-core` (WCAG 2.1/2.2).
*   **🛡️ Security**: OWASP Top 10 checks and security header analysis.
*   **🔍 SEO**: Validates meta tags, structured data, and content quality.
*   **📱 Mobile UX**: Touch target analysis and responsive design validation.
*   **🧠 AI Insights**: Token-efficient AI reports (`AI-ANALYSIS.json`) with actionable fix guidance.
*   **🔄 CI/CD Support**: Native integration for GitHub Actions, GitLab CI, and more.

## 📚 Documentation

Detailed documentation is available in the [`/docs`](./docs) directory:

*   [Getting Started](./docs/getting-started.md)
*   [CLI & CI Usage](./docs/cli-and-ci.md)
*   [Configuration](./docs/configuration-and-routes.md)
*   [Features](./docs/FEATURES.md)
*   [Release Notes](./docs/)

## 🤝 Contributing

Contributions are welcome! Please check out our [Roadmap](./ROADMAP.md) and open issues for bugs or feature requests.

## 📄 License

MIT © [Signaler Team](https://signaler.dev)
