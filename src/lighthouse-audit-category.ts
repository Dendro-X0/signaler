import type { AnalyzeActionV6 } from "./engine-contracts/artifacts/index.js";
import type { PerformanceIssueKind } from "./engine-contracts/artifacts/v3/performance-triage-v3.js";

const SEO_AUDIT_IDS = new Set([
  "canonical",
  "crawlable-anchors",
  "document-title",
  "hreflang",
  "html-has-lang",
  "http-status-code",
  "is-crawlable",
  "link-text",
  "meta-description",
  "robots-txt",
  "structured-data",
]);

const ACCESSIBILITY_AUDIT_IDS = new Set([
  "accesskeys",
  "aria-allowed-attr",
  "aria-command-name",
  "aria-hidden-body",
  "aria-hidden-focus",
  "aria-input-field-name",
  "aria-meter-name",
  "aria-progressbar-name",
  "aria-required-attr",
  "aria-required-children",
  "aria-required-parent",
  "aria-roles",
  "aria-toggle-field-name",
  "aria-tooltip-name",
  "aria-valid-attr",
  "aria-valid-attr-value",
  "button-name",
  "bypass",
  "color-contrast",
  "definition-list",
  "dlitem",
  "duplicate-id-active",
  "duplicate-id-aria",
  "form-field-multiple-labels",
  "frame-title",
  "heading-order",
  "image-alt",
  "input-button-name",
  "input-image-alt",
  "label",
  "landmark-one-main",
  "link-name",
  "list",
  "listitem",
  "meta-refresh",
  "object-alt",
  "tabindex",
  "table-duplicate-name",
  "table-fake-caption",
  "td-has-header",
  "td-headers-attr",
  "th-has-data-cells",
  "valid-lang",
  "video-caption",
]);

const BEST_PRACTICES_AUDIT_IDS = new Set([
  "charset",
  "deprecations",
  "errors-in-console",
  "geolocation-on-start",
  "inspector-issues",
  "is-on-https",
  "js-libraries",
  "notification-on-start",
  "paste-preventing-inputs",
  "uses-http2",
  "uses-passive-event-listeners",
]);

export function inferLighthouseIssueCategory(params: {
  readonly issueId: string;
  readonly kind: PerformanceIssueKind;
}): AnalyzeActionV6["category"] {
  if (params.kind === "opportunity") {
    return "performance";
  }
  const issueId = params.issueId.trim();
  if (SEO_AUDIT_IDS.has(issueId)) {
    return "seo";
  }
  if (ACCESSIBILITY_AUDIT_IDS.has(issueId) || issueId.startsWith("aria-")) {
    return "accessibility";
  }
  if (BEST_PRACTICES_AUDIT_IDS.has(issueId)) {
    return "best-practices";
  }
  return "performance";
}
