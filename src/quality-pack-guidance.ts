import type { QualityPackResult } from "./quality-pack.js";

export type QualityPackGuidanceSection = {
  readonly id: string;
  readonly title: string;
  readonly lines: readonly string[];
};

export function buildQualityPackGuidance(pack: QualityPackResult): readonly QualityPackGuidanceSection[] {
  const violationIds = new Set(pack.violations.map((violation) => violation.id));
  const sections: QualityPackGuidanceSection[] = [];

  if (violationIds.has("max-header-failures") || violationIds.has("headers-missing")) {
    sections.push({
      id: "security-headers",
      title: "Security headers (common on first run)",
      lines: [
        "Inspect .signaler/headers.json for missing header names per route.",
        "Next.js: add global headers in next.config.ts headers() or middleware.ts.",
        "Typical starter set: Content-Security-Policy, X-Content-Type-Options, X-Frame-Options, Referrer-Policy, Permissions-Policy.",
        "Phased rollout: allow temporary failures while fixing:",
        '  "qualityPack": { "maxHeaderFailures": 12, "maxBrokenLinks": 0 }',
        "Re-run: signaler audit --quality-profile web-quality --skip-discover --managed-serve",
      ],
    });
  }

  if (violationIds.has("links-inconclusive")) {
    sections.push({
      id: "links-discovery",
      title: "Links check inconclusive",
      lines: [
        "0 URLs were discovered — Broken=0 is not a meaningful pass.",
        "Verify base URL and that /sitemap.xml is reachable from the audited server.",
        "Ensure audited routes expose crawlable internal links when sitemap is empty.",
        "Inspect .signaler/links.json (discovered.total, checkStatus).",
      ],
    });
  }

  if (violationIds.has("max-broken-links") || violationIds.has("links-missing")) {
    sections.push({
      id: "broken-links",
      title: "Broken links",
      lines: [
        "Inspect .signaler/links.json broken[] for URLs and status codes.",
        "Fix redirects, 404s, and auth-gated links surfaced in CI.",
      ],
    });
  }

  if (violationIds.has("bundle-empty") || violationIds.has("bundle-missing")) {
    sections.push({
      id: "bundle-scan",
      title: "Bundle scan",
      lines: [
        "Ensure a production build exists (.next/static for Next.js apps).",
        "Monorepos: bundle scans the resolved web app root (for example apps/web).",
        "Run managed production serve or build manually before audit when using --managed-serve-skip-build.",
      ],
    });
  }

  if (violationIds.has("max-health-errors") || violationIds.has("health-missing")) {
    sections.push({
      id: "health-check",
      title: "Health / availability",
      lines: [
        "Inspect .signaler/health.json for non-2xx status codes and runtimeErrorMessage per route.",
        "Ensure managed serve is running and routes respond before side runners execute.",
        "Phased rollout: allow temporary failures while fixing:",
        '  "qualityPack": { "maxHealthErrors": 5 }',
      ],
    });
  }

  if (violationIds.has("max-console-error-combos") || violationIds.has("console-missing")) {
    sections.push({
      id: "console-errors",
      title: "Console errors",
      lines: [
        "Inspect .signaler/console.json for combos with status error.",
        "Fix uncaught exceptions and failed asset loads surfaced during page load.",
        '  "qualityPack": { "maxConsoleErrorCombos": 0 }',
      ],
    });
  }

  if (violationIds.has("max-measure-runtime-errors") || violationIds.has("measure-missing")) {
    sections.push({
      id: "measure-runtime",
      title: "Measure (fast lab)",
      lines: [
        "Inspect .signaler/measure-summary.json for runtimeErrorMessage per combo.",
        "Measure uses CDP/Chrome — ensure Chrome is available in CI (same as Lighthouse).",
      ],
    });
  }

  if (
    violationIds.has("max-accessibility-critical")
    || violationIds.has("max-accessibility-serious")
    || violationIds.has("max-accessibility-runtime-errors")
    || violationIds.has("accessibility-missing")
    || violationIds.has("benchmark-accessibility-max-critical")
    || violationIds.has("benchmark-accessibility-max-serious")
  ) {
    sections.push({
      id: "accessibility-axe",
      title: "Accessibility (axe-core)",
      lines: [
        "Inspect .signaler/accessibility-summary.json and runners/accessibility/ artifacts.",
        "Fix critical/serious violations first; rerun signaler accessibility --config signaler.config.json.",
        'Phased rollout: "qualityPack": { "maxAccessibilitySeriousViolations": 10 }',
        "Unified plane: inspect runners/benchmark-bridge/accessibility-extended.json for WCAG metric totals.",
      ],
    });
  }

  if (
    violationIds.has("benchmark-security-max-records")
    || violationIds.has("benchmark-security-max-missing-headers")
    || violationIds.has("benchmark-security-max-tls-issues")
    || violationIds.has("benchmark-bridge-missing")
  ) {
    sections.push({
      id: "benchmark-security",
      title: "Benchmark security-baseline signals",
      lines: [
        "Inspect .signaler/runners/benchmark-bridge/security-baseline.json for OWASP-aligned header metrics.",
        "Override family limits explicitly:",
        '  "qualityPack": { "benchmarkSignals": { "securityBaseline": { "maxMissingHeaders": 12 } } }',
      ],
    });
  }

  if (
    violationIds.has("benchmark-reliability-max-records")
    || violationIds.has("benchmark-reliability-max-high-latency")
  ) {
    sections.push({
      id: "benchmark-reliability",
      title: "Benchmark reliability-slo signals",
      lines: [
        "Inspect .signaler/runners/benchmark-bridge/reliability-slo.json for availability/latency metrics.",
        "Tune high-latency threshold: qualityPack.benchmarkSignals.highLatencyMs (default 400).",
      ],
    });
  }

  if (
    violationIds.has("benchmark-seo-max-indexability")
    || violationIds.has("benchmark-seo-max-crawlability")
  ) {
    sections.push({
      id: "benchmark-seo",
      title: "Benchmark seo-technical signals",
      lines: [
        "Inspect .signaler/runners/benchmark-bridge/seo-technical.json for indexability/crawlability metrics.",
        "Cross-check .signaler/links.json and Lighthouse SEO audits in results.json.",
      ],
    });
  }

  return sections;
}

export function formatQualityPackGuidanceText(sections: readonly QualityPackGuidanceSection[]): string {
  if (sections.length === 0) {
    return "";
  }
  const lines: string[] = ["Onboarding guidance:"];
  for (const section of sections) {
    lines.push("", section.title);
    for (const line of section.lines) {
      lines.push(`  ${line}`);
    }
  }
  return lines.join("\n");
}
