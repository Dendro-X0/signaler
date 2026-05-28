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
